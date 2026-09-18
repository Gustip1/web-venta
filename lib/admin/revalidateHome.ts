/**
 * Llamar después de guardar cualquier setting que afecte el home/nosotros
 * (contenido cacheado por ISR) — sin esto el cambio puede tardar hasta
 * 5 minutos y varias visitas en aparecer para los clientes.
 */
export async function revalidateHome(): Promise<void> {
  try {
    await fetch('/api/admin/revalidate', { method: 'POST' });
  } catch {
    // No bloqueamos el guardado si esto falla — el contenido igual se
    // actualiza solo, más tarde, por el revalidate normal de la página.
  }
}
