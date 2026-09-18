import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[PROFILE] get error:', error);
    return NextResponse.json({ error: 'No se pudo obtener el perfil' }, { status: 500 });
  }

  return NextResponse.json({
    profile: data || { id: user.id, first_name: null, last_name: null, phone: null, role: 'user' },
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const phone = clean(body?.phone);

  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: 'Nombre, apellido y teléfono son obligatorios' },
      { status: 400 }
    );
  }
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 30) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('[PROFILE] update error:', error);
    return NextResponse.json({ error: 'No se pudo guardar el perfil' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
