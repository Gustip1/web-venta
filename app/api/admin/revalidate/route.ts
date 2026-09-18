import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerProfile } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fuerza a regenerar las páginas cacheadas (home, nosotros) apenas el admin
 * guarda un cambio en /admin/portada, /admin/ajustes u /admin/opiniones —
 * sin esto, el home (revalidate=300) puede tardar varios minutos y varias
 * visitas hasta mostrar el cambio.
 */
export async function POST() {
  const { profile } = await getServerProfile();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  revalidatePath('/');
  revalidatePath('/nosotros');

  return NextResponse.json({ revalidated: true });
}
