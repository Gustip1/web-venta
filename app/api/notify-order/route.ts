import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.order_id;
    if (!orderId) return NextResponse.json({ ok: false, error: 'order_id requerido' }, { status: 400 });

    const supabase = await createServerSupabase();

    // Obtener orden y asegurar permisos (admin via RLS)
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, email, first_name, last_name, status, created_at')
      .eq('id', orderId)
      .single();
    if (error || !order) return NextResponse.json({ ok: false, error: error?.message || 'Orden no encontrada' }, { status: 404 });

    const orderNumber = order.order_number || 'PENDIENTE';
    const email = order.email || '';

    // Mensaje por defecto (para enviar por email/WhatsApp)
    const message = `Hola ${order.first_name || ''} ${order.last_name || ''}!
Gracias por tu compra.

Tu número de orden es: ${orderNumber}.

Podés seguir el estado de tu pedido así:
1) Si tenés cuenta de Google, iniciá sesión en la web (Login con Google) y entrá a Mis Pedidos: https://$${req.headers.get('host')}/orders
2) O ingresá a https://$${req.headers.get('host')}/track y poné este número de orden junto a tu email (${email}).

Ante cualquier consulta, respondé este mensaje con tu número de orden. Gracias!`;

    // Aquí integrar proveedor de email/SMS/WhatsApp (stub)
    // Por ahora devolvemos el mensaje para que el admin lo vea/copie

    return NextResponse.json({ ok: true, messagePreview: message });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}


