import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerProfile } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fuerza a regenerar las páginas cacheadas apenas el admin guarda un cambio en
 * /admin/portada, /admin/ajustes u /admin/opiniones — sin esto, el home
 * (revalidate=300) puede tardar varios minutos y varias visitas hasta mostrar
 * el cambio.
 *
 * Se revalida el layout completo, no sólo el home: la configuración de la
 * tienda (cinta de arriba, precio del envío) la resuelve el layout y la usan
 * también el checkout y las fichas de producto. Revalidando sólo '/' el
 * checkout seguía cobrando el envío viejo.
 */
export async function POST() {
  const { profile } = await getServerProfile();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  revalidatePath('/', 'layout');

  return NextResponse.json({ revalidated: true });
}
