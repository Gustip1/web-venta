import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const orderId = String(form.get('order_id') || '');

    // Validación de entrada
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    if (!orderId || orderId.length === 0) {
      return NextResponse.json({ error: 'order_id requerido' }, { status: 400 });
    }

    // Validar UUID format para orderId (prevenir path traversal)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: 'order_id inválido' }, { status: 400 });
    }
    
    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP)' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceRole);

    // Verificar que la orden existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf as ArrayBuffer);

    // Generar nombre de archivo seguro
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `payment-proofs/${orderId}-${timestamp}-${randomStr}.${extension}`;

    const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600'
    });

    if (upErr) {
      console.error('[ERROR] Error al subir comprobante:', upErr);
      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from('payment-proofs').getPublicUrl(path);

    const { error: updErr } = await supabase
      .from('orders')
      .update({
        payment_proof_url: pub.publicUrl,
        payment_status: 'pending'
      })
      .eq('id', orderId);

    if (updErr) {
      console.error('[ERROR] Error al actualizar orden:', updErr);
      return NextResponse.json({ error: 'Error al actualizar la orden' }, { status: 500 });
    }

    console.info(`[INFO] Comprobante de pago subido para orden ${orderId}`);

    return NextResponse.json({ ok: true, url: pub.publicUrl });
  } catch (error: any) {
    console.error('[ERROR] Error inesperado en /api/upload-proof:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}


