/**
 * Categorías destacadas de la home ("Elegí tu estilo").
 *
 * Viven en su propio módulo, sin componentes, para que tanto el servidor
 * (app/page.tsx) como los componentes de la interfaz puedan importarlas sin
 * cruzar la frontera server/client: importar datos desde un módulo que
 * además exporta componentes hace que Next los sirva como referencias
 * remotas y algo tan simple como un .filter() falle al compilar para
 * producción.
 *
 * Qué categorías se muestran, con qué nombre y con qué foto se elige desde
 * /admin/portada. Las opciones posibles salen de STREETWEAR_SUBCATEGORIES
 * (types/db) más "sneakers", que es una categoría propia.
 */

import { STREETWEAR_SUBCATEGORIES } from '@/types/db';

export type CategoryTile = { label: string; sub: string; href: string };

/** Todas las categorías que el admin puede mostrar en la home. */
export const AVAILABLE_CATEGORY_TILES: CategoryTile[] = [
  { label: 'Sneakers', sub: 'sneakers', href: '/productos?sneakers' },
  ...STREETWEAR_SUBCATEGORIES.map((s) => ({
    label: s.label,
    sub: s.value,
    href: `/productos?streetwear&sub=${s.value}`,
  })),
];

/** Lo que se muestra mientras nadie haya elegido nada en /admin/portada. */
export const DEFAULT_VISIBLE_SUBS = ['sneakers', 'remeras', 'hoodies', 'pantalones'];

export const CATEGORY_TILES: CategoryTile[] = AVAILABLE_CATEGORY_TILES.filter((c) =>
  DEFAULT_VISIBLE_SUBS.includes(c.sub)
);

/** Lo que guarda /admin/portada para cada categoría. */
export type CategoryTileConfig = {
  sub: string;
  label?: string;
  url?: string;
  /** Sin guardar (config vieja) se asume visible si está entre las de siempre. */
  visible?: boolean;
};

/**
 * Qué categorías mostrar, con el nombre y el orden que definió el admin.
 * Una config vieja (sin el campo `visible`) sigue mostrando las de siempre.
 */
export function resolveVisibleTiles(config: CategoryTileConfig[] | undefined): CategoryTile[] {
  if (!Array.isArray(config) || config.length === 0) return CATEGORY_TILES;

  const tiles = config
    .filter((t) => t?.sub && (t.visible ?? DEFAULT_VISIBLE_SUBS.includes(t.sub)))
    .map((t) => {
      const base = AVAILABLE_CATEGORY_TILES.find((c) => c.sub === t.sub);
      if (!base) return null;
      return { ...base, label: t.label?.trim() || base.label };
    })
    .filter((t): t is CategoryTile => t !== null);

  // Si el admin las apagó todas, la sección no se muestra.
  return tiles;
}
