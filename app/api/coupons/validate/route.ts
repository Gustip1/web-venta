import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicApiLimiter } from '@/lib/security/rate-limiter';
import { getClientIp } from '@/lib/security/get-client-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Solo valida y muestra el descuento — no consume el uso del cupón.
 * El consumo real (atómico) pasa en /api/orders al confirmar la compra.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (publicApiLimiter.isBlocked(clientIp)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá de nuevo en un minuto.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const code = String(body?.code || '').trim();
  const subtotal = Number(body?.subtotal);

  if (!code) {
    return NextResponse.json({ error: 'Ingresá un código' }, { status: 400 });
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: 'Subtotal inválido' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('discount_codes')
    .select('type, value, active, starts_at, ends_at, max_uses, used_count')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  publicApiLimiter.recordFailedAttempt(clientIp);

  if (error || !data) {
    return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });
  }

  const now = new Date();
  if (!data.active) {
    return NextResponse.json({ error: 'Cupón inactivo' }, { status: 400 });
  }
  if (data.starts_at && new Date(data.starts_at) > now) {
    return NextResponse.json({ error: 'Cupón todavía no está vigente' }, { status: 400 });
  }
  if (data.ends_at && new Date(data.ends_at) < now) {
    return NextResponse.json({ error: 'Cupón vencido' }, { status: 400 });
  }
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return NextResponse.json({ error: 'Cupón agotado' }, { status: 400 });
  }

  const discountAmount =
    data.type === 'percent'
      ? Math.round(subtotal * data.value) / 100
      : Math.min(data.value, subtotal);

  return NextResponse.json({
    valid: true,
    type: data.type,
    value: data.value,
    discountAmount,
  });
}
