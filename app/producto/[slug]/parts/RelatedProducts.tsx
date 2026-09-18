"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ArrowRight } from 'lucide-react';

/**
 * "También te puede gustar" al pie de la ficha.
 *
 * Por qué: la ficha era un callejón sin salida — terminaba en los sellos de
 * confianza. Quien no se convencía con ESE producto no tenía a dónde seguir y
 * se iba. Según las analíticas, llegar a una ficha duplica la permanencia
 * (48s vs 20s), así que encadenar fichas es lo que más suma para retener.
 *
 * Prioriza productos de la misma marca y completa con la misma categoría.
 */
export function RelatedProducts({
  productId,
  category,
  brand,
}: {
  productId: string;
  category: string;
  brand?: string | null;
}) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const base = () => supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('active', true)
        .neq('id', productId)
        .order('created_at', { ascending: false });

      const [sameBrand, sameCategory] = await Promise.all([
        brand ? base().eq('brand', brand).limit(8) : Promise.resolve({ data: [] as unknown[] }),
        base().eq('category', category).limit(12),
      ]);

      // Misma marca primero; se completa con la categoría, sin repetir
      const seen = new Set<string>();
      const merged: Product[] = [];
      [...(sameBrand.data ?? []), ...(sameCategory.data ?? [])].forEach((p: any) => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        merged.push(p as Product);
      });

      if (!cancelled) setItems(merged.slice(0, 8));
    })();
    return () => { cancelled = true; };
  }, [productId, category, brand]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10 md:mt-16 border-t border-gray-200 pt-8 md:pt-12" aria-labelledby="related-title">
      <div className="flex items-end justify-between gap-4 mb-5 md:mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-1.5">
            Seguí mirando
          </p>
          <h2 id="related-title" className="text-2xl md:text-4xl font-black text-gray-900 leading-none tracking-tight">
            También te puede gustar
          </h2>
        </div>
        <Link
          href={`/productos?${category}`}
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-tight hover:bg-black transition-colors shrink-0"
        >
          Ver todo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      <Link
        href={`/productos?${category}`}
        className="sm:hidden mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gray-900 text-white text-sm font-black uppercase tracking-tight"
      >
        Ver todo <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
