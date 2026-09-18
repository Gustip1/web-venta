import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  // Rate limiting: 5 encargos por minuto por IP
  if (publicApiLimiter.isBlocked(clientIp)) {
    console.warn(`[SECURITY] API encargos bloqueada desde IP: ${clientIp}`);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
      { status: 429 }
    );
  }

  const supabase = await createServerSupabase();
  const body = await req.json().catch(() => null);

  if (!body || !body.message) {
    return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 });
  }

  // Validación de longitud
  const message = String(body.message).trim();
  const customerEmail = body.customer_email ? String(body.customer_email).trim() : null;

  if (message.length === 0) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo (máximo 5000 caracteres)' }, { status: 400 });
  }

  // Validación de email si se proporciona
  if (customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (customerEmail.length > 255) {
      return NextResponse.json({ error: 'Email demasiado largo' }, { status: 400 });
    }
  }

  // Sanitización básica: eliminar HTML tags
  const sanitizedMessage = message.replace(/<[^>]*>/g, '');
  const sanitizedEmail = customerEmail?.replace(/<[^>]*>/g, '') || null;

  try {
    const { data, error } = await supabase
      .from('custom_orders')
      .insert({ 
        customer_email: sanitizedEmail, 
        message: sanitizedMessage 
      })
      .select('*')
      .single();

    if (error) {
      console.error('[ERROR] Error al crear custom order:', error);
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }

    // Registrar intento (para rate limiting)
    publicApiLimiter.recordFailedAttempt(clientIp);

    console.info(`[INFO] Nuevo encargo creado desde IP ${clientIp}`);

    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    console.error('[ERROR] Error inesperado en /api/encargos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}


