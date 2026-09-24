import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrderItemInput {
  productId: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

interface OrderRequestBody {
  items: OrderItemInput[];
  fulfillment: 'pickup' | 'shipping';
  paymentMethod: 'cash' | 'crypto_transfer' | 'installments_3';
  couponCode?: string | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    document: string;
  };
  address: {
    street: string;
    number: string;
    unit: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  } | null;
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
      { status: 429 }
    );
  }

  try {
    const body: OrderRequestBody = await req.json();

    // ── Validation ──
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    if (!['pickup', 'shipping'].includes(body.fulfillment)) {
      return NextResponse.json({ error: 'Método de entrega inválido' }, { status: 400 });
    }

    if (!['cash', 'crypto_transfer', 'installments_3'].includes(body.paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    // Cash only available for pickup
    if (body.paymentMethod === 'cash' && body.fulfillment !== 'pickup') {
      return NextResponse.json({ error: 'Efectivo solo disponible para retiro en showroom' }, { status: 400 });
    }

    if (!body.contact?.firstName?.trim() || !body.contact?.email?.trim()) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    // Shipping requires full address
    if (body.fulfillment === 'shipping') {
      if (!body.contact.lastName?.trim()) return NextResponse.json({ error: 'Apellido requerido para envío' }, { status: 400 });
      if (!body.contact.phone?.trim()) return NextResponse.json({ error: 'Teléfono requerido para envío' }, { status: 400 });
      if (!body.contact.document?.trim()) return NextResponse.json({ error: 'Documento requerido para envío' }, { status: 400 });
      if (!body.address?.postalCode?.trim()) return NextResponse.json({ error: 'Código postal requerido' }, { status: 400 });
      if (!body.address?.street?.trim()) return NextResponse.json({ error: 'Dirección requerida' }, { status: 400 });
    }

    // Validate item data
    for (const item of body.items) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(item.productId)) {
        return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 });
      }
      if (item.quantity < 1) {
        return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      }
    }

    // ── Use service role for stock operations (bypass RLS) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRole);

    // ── Verify stock availability and fetch the real (server-side) price for each item/size ──
    // Never trust item.price from the client body — recompute it from the product row.
    const resolvedItems: { variantId: string; productId: string; title: string; slug: string; size: string; quantity: number; price: number }[] = [];

    for (const item of body.items) {
      const { data: variant, error: varErr } = await supabase
        .from('product_variants')
        .select('id, stock, products(price, sale_price, title, slug, active)')
        .eq('product_id', item.productId)
        .eq('size', item.size)
        .single();

      const product = (variant as any)?.products;

      if (varErr || !variant || !product || product.active === false) {
        return NextResponse.json(
          { error: `Talle ${item.size} no encontrado para ${item.title}` },
          { status: 400 }
        );
      }

      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${item.title} talle ${item.size}. Disponible: ${variant.stock}` },
          { status: 400 }
        );
      }

      const realPrice = Number(product.sale_price ?? product.price);

      resolvedItems.push({
        variantId: variant.id,
        productId: item.productId,
        title: product.title,
        slug: product.slug,
        size: item.size,
        quantity: item.quantity,
        price: realPrice,
      });
    }

    // ── Calculate subtotal from server-side prices ──
    const grossSubtotal = resolvedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

    // ── Apply coupon (optional) — atomic: validates vigencia/máximo de usos y consume un uso ──
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (body.couponCode && body.couponCode.trim()) {
      const { data: redeemData, error: redeemErr } = await supabase.rpc('redeem_discount_code', {
        p_code: body.couponCode.trim(),
        p_subtotal: grossSubtotal,
      });
      const redeemRow = Array.isArray(redeemData) ? redeemData[0] : redeemData;

      if (redeemErr || !redeemRow?.ok) {
        return NextResponse.json(
          { error: redeemRow?.reason || 'No se pudo aplicar el cupón' },
          { status: 400 }
        );
      }

      discountAmount = Number(redeemRow.discount_amount);
      appliedCouponCode = body.couponCode.trim().toUpperCase();
    }

    const subtotal = grossSubtotal - discountAmount;

    // ── Envío ──
    // El monto y el valor del dólar se leen acá (no se confía en el cliente):
    // el admin los carga en /admin/ajustes y /admin/precios. La orden guarda
    // todo en USD, así que el costo en moneda local se convierte.
    let shippingCost = 0;
    if (body.fulfillment === 'shipping') {
      const { data: settingsRows } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['store_config', 'usd_ars_rate']);

      const byKey = new Map((settingsRows ?? []).map((r: any) => [r.key, r.value]));
      const costLocal = Number((byKey.get('store_config') as any)?.shipping?.cost ?? 0);
      const rate = Number(byKey.get('usd_ars_rate') ?? 0);

      if (costLocal > 0 && rate > 0) shippingCost = Number((costLocal / rate).toFixed(2));
    }

    // ── Create order ──
    const orderPayload: Record<string, any> = {
      status: 'draft',
      fulfillment: body.fulfillment,
      first_name: body.contact.firstName.trim(),
      last_name: body.contact.lastName?.trim() || null,
      email: body.contact.email.trim().toLowerCase(),
      phone: body.contact.phone?.trim() || null,
      document: body.contact.document?.trim() || null,
      subtotal,
      discount_code: appliedCouponCode,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      payment_method: body.paymentMethod,
      payment_status: 'pending',
    };

    let { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id, order_number')
      .single();

    // Fallback de compatibilidad: si todavía no se corrió la migración de cupones
    // (supabase/migration-discount-codes.sql), discount_code/discount_amount no
    // existen en la tabla y el insert de ARRIBA falla siempre — reintentamos sin
    // esos dos campos en vez de romper el checkout completo por una migración
    // pendiente.
    if (orderErr && /column .*discount_(code|amount).* does not exist/i.test(orderErr.message || '')) {
      console.warn('[ORDERS] Faltan las columnas discount_code/discount_amount (correr migration-discount-codes.sql). Reintentando sin cupón.');
      const { discount_code, discount_amount, ...fallbackPayload } = orderPayload;
      const retry = await supabase.from('orders').insert(fallbackPayload).select('id, order_number').single();
      order = retry.data;
      orderErr = retry.error;
    }

    if ((orderErr || !order) && appliedCouponCode) {
      await supabase.rpc('release_discount_code_use', { p_code: appliedCouponCode }).then(null, () => {});
    }

    if (orderErr || !order) {
      console.error('[ORDERS] Error creating order:', orderErr);
      return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 });
    }

    // ── Create order items (server-side price, never the client-supplied one) ──
    const { error: itemsErr } = await supabase.from('order_items').insert(
      resolvedItems.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        title: it.title,
        slug: it.slug,
        price: it.price,
        size: it.size,
        quantity: it.quantity,
      }))
    );

    if (itemsErr) {
      console.error('[ORDERS] Error creating order items:', itemsErr);
      // Cleanup: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      if (appliedCouponCode) {
        await supabase.rpc('release_discount_code_use', { p_code: appliedCouponCode });
      }
      return NextResponse.json({ error: 'Error al registrar los productos' }, { status: 500 });
    }

    // ── Create shipping address if needed ──
    if (body.fulfillment === 'shipping' && body.address) {
      await supabase.from('shipping_addresses').insert({
        order_id: order.id,
        street: body.address.street?.trim() || null,
        number: body.address.number?.trim() || null,
        unit: body.address.unit?.trim() || null,
        city: body.address.city?.trim() || null,
        province: body.address.province?.trim() || null,
        postal_code: body.address.postalCode?.trim() || null,
        notes: body.address.notes?.trim() || null,
      });
    }

    // ── Decrement stock atomically for all items of this order (rolls back entirely on any shortage) ──
    const { error: stockErr } = await supabase.rpc('process_order_stock', {
      p_order_id: order.id,
    });

    if (stockErr) {
      console.error(`[ORDERS] Stock processing failed for order ${order.id}:`, stockErr);
      // Roll back: delete the order (cascades to order_items / shipping_addresses) and release the coupon use
      await supabase.from('orders').delete().eq('id', order.id);
      if (appliedCouponCode) {
        await supabase.rpc('release_discount_code_use', { p_code: appliedCouponCode });
      }
      return NextResponse.json(
        { error: 'El stock cambió mientras confirmábamos tu pedido. Actualizá el carrito e intentá de nuevo.' },
        { status: 409 }
      );
    }

    console.info(`[ORDERS] Order created: ${order.id} (${body.paymentMethod})`);

    publicApiLimiter.recordFailedAttempt(clientIp);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      discountAmount,
    });
  } catch (err: any) {
    console.error('[ORDERS] Unexpected error:', err);
    return NextResponse.json({ error: 'Error inesperado al procesar la orden' }, { status: 500 });
  }
}
