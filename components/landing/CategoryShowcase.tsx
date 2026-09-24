import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { CATEGORY_TILES, CategoryTile as Tile } from '@/lib/categories';

// Se re-exportan para no romper imports existentes; la fuente es lib/categories.
export { CATEGORY_TILES };
export type { CategoryTileConfig } from '@/lib/categories';

/**
 * Server component: recibe las imágenes ya resueltas por app/page.tsx
 * (config del admin + fallback a la última foto de producto) — sin fetch
 * propio en el cliente.
 *
 * El contenedor (className) define el tamaño: en mobile las filas del bento
 * dan la altura y acá solo se llena; en desktop se pasa el aspect ratio.
 */
function CategoryTile({
  c,
  images,
  className,
  imgSizes,
}: {
  c: Tile;
  images: Record<string, string>;
  className?: string;
  imgSizes: string;
}) {
  return (
    <Link
      href={c.href}
      className={cn(
        'group relative block overflow-hidden rounded-2xl bg-gray-100 active:scale-[0.98] transition-transform duration-200',
        className
      )}
    >
      {images[c.sub] ? (
        <Image
          src={images[c.sub]}
          alt={c.label}
          fill
          sizes={imgSizes}
          quality={90}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
      )}

      {/* Velo para que la etiqueta lea siempre, sin depender de la foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none drop-shadow-sm">
          {c.label}
        </h3>
        <span
          className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 text-gray-900 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </span>
      </div>
    </Link>
  );
}

export function CategoryShowcase({
  images,
  tiles = CATEGORY_TILES,
}: {
  images: Record<string, string>;
  tiles?: Tile[];
}) {
  // El admin puede apagarlas todas desde /admin/portada: sin categorías no hay sección.
  if (tiles.length === 0) return null;

  return (
    <section className="bg-white pt-8 pb-12 md:pt-10 md:pb-16" aria-labelledby="categories-title">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* ── Header — mismo lenguaje visual que el resto de las secciones ── */}
        <div className="mb-5 md:mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">
            Categorías
          </p>
          <h2 id="categories-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
            Elegí tu estilo
          </h2>
        </div>

        {/* ── Mobile: de a dos por fila. Antes era un bento con las cuatro
              categorías fijas por nombre; ahora la lista la arma el admin y
              puede tener cualquier cantidad. ── */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {tiles.map((c) => (
            <CategoryTile key={c.sub} c={c} images={images} className="h-44" imgSizes="50vw" />
          ))}
        </div>

        {/* ── Desktop / tablet: hasta cuatro por fila ── */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {tiles.map((c) => (
            <CategoryTile key={c.sub} c={c} images={images} className="aspect-[3/4]" imgSizes="25vw" />
          ))}
        </div>
      </div>
    </section>
  );
}
