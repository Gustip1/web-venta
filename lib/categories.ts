/**
 * Categorías destacadas de la home.
 *
 * Viven en su propio módulo, sin componentes, para que tanto el servidor
 * (app/page.tsx) como los componentes de la interfaz puedan importarlas sin
 * cruzar la frontera server/client: importar datos desde un módulo que
 * además exporta componentes hace que Next los sirva como referencias
 * remotas y algo tan simple como un .filter() falle al compilar para
 * producción.
 *
 * Para cambiar qué categorías se muestran, editá esta lista. Las imágenes de
 * cada una se eligen desde /admin/portada.
 */

export const CATEGORY_TILES = [
  { label: 'Remeras',    sub: 'remeras',    href: '/productos?streetwear&sub=remeras' },
  { label: 'Hoodies',    sub: 'hoodies',    href: '/productos?streetwear&sub=hoodies' },
  { label: 'Pantalones', sub: 'pantalones', href: '/productos?streetwear&sub=pantalones' },
  { label: 'Sneakers',   sub: 'sneakers',   href: '/productos?sneakers' },
] as const;

export type CategoryTile = (typeof CATEGORY_TILES)[number];

/** Lo que guarda /admin/portada para cada categoría. */
export type CategoryTileConfig = { sub: string; label?: string; url?: string };
