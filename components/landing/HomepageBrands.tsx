"use client";
import { useState } from 'react';
import { Product } from '@/types/db';
import { BrandShowcase } from './BrandShowcase';
import { ChevronDown } from 'lucide-react';

import type { HomeBrandEntry } from '@/lib/homeContent';

export type { HomeBrandEntry };

/**
 * Carruseles de marca de la home.
 *
 * Se muestran los primeros y el resto queda detrás de un botón. Según las
 * analíticas la home medía 10,4 pantallas de celular y la mitad de la gente
 * bajaba solo hasta el 27%: los últimos carruseles no los veía nadie y, peor,
 * la fila de bloques casi idénticos aburría y hacía abandonar antes. Nada se
 * pierde: se despliega en el lugar con un toque.
 */
const VISIBLE_BY_DEFAULT = 3;

export function HomepageBrands({
  entries,
  productsByEntry,
}: {
  entries: HomeBrandEntry[];
  productsByEntry: Record<string, Product[]>;
}) {
  const [expanded, setExpanded] = useState(false);

  // Solo cuentan las que realmente tienen productos para mostrar
  const withProducts = entries.filter((e) => (productsByEntry[e.id] ?? []).length > 0);
  const visible = expanded ? withProducts : withProducts.slice(0, VISIBLE_BY_DEFAULT);
  const hidden = withProducts.length - visible.length;

  const render = (e: HomeBrandEntry) =>
    e.kind === 'sneakers' ? (
      <BrandShowcase
        key={e.id}
        title={e.title || 'Sneakers'}
        eyebrow={e.eyebrow}
        category="sneakers"
        href="/productos?sneakers"
        initialProducts={productsByEntry[e.id] ?? []}
      />
    ) : (
      <BrandShowcase
        key={e.id}
        title={e.title}
        eyebrow={e.eyebrow}
        brandSlug={e.slug}
        href={`/productos?brand=${e.slug}`}
        initialProducts={productsByEntry[e.id] ?? []}
      />
    );

  return (
    <>
      {visible.map(render)}

      {hidden > 0 && (
        <div className="bg-white pb-10 md:pb-14">
          <div className="max-w-[1400px] mx-auto px-4">
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-tight hover:bg-gray-900 hover:text-white active:scale-[0.99] transition-all"
            >
              Ver {hidden} {hidden === 1 ? 'marca más' : 'marcas más'}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
