"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface BrandShowcaseProps {
  /** Texto grande que titula la sección (ej. "Eme Studios") */
  title: string;
  /** Subtítulo opcional sobre el título */
  eyebrow?: string;
  /** Filtra por marca (slug en products.brand). Omitir si se usa `category`. */
  brandSlug?: string;
  /** Filtra por categoría (ej. 'sneakers'). Tiene prioridad sobre brandSlug si ambos están. */
  category?: 'sneakers' | 'streetwear';
  /** Destino del botón "Shop now" / "Ver todo" */
  href: string;
  /** Cantidad máxima de productos a traer */
  limit?: number;
  /**
   * Productos ya resueltos server-side (app/page.tsx). Si vienen, este
   * componente no dispara ningún fetch propio — evita que cada carrusel de
   * marca haga su propio round-trip a Supabase en el cliente.
   */
  initialProducts?: Product[];
}

export function BrandShowcase({
  title,
  eyebrow,
  brandSlug,
  category,
  href,
  limit = 10,
  initialProducts,
}: BrandShowcaseProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(initialProducts === undefined);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      // loop con pocos productos (relativo a los ~4 slides visibles en desktop)
      // genera saltos/huecos raros en el autoplay — mismo criterio que NewArrivalsCarousel.
      loop: products.length > 4,
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps',
      dragFree: true,
    },
    [Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    // Ya vienen resueltos desde el servidor (app/page.tsx) — no repetir el fetch.
    if (initialProducts !== undefined) return;

    const supabase = createBrowserClient();
    let active = true;

    (async () => {
      try {
        let query = supabase
          .from('products')
          .select('*, product_variants(stock,size)')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (category) query = query.eq('category', category);
        else if (brandSlug) query = query.eq('brand', brandSlug);

        const { data } = await query;
        if (!active) return;
        if (data) setProducts(data as unknown as Product[]);
      } catch (error) {
        console.error('Error cargando productos de la sección:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [brandSlug, category, limit, initialProducts]);

  // No renderizamos secciones vacías
  if (!loading && products.length === 0) return null;

  return (
    <section className="bg-white py-10 md:py-14 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] font-bold mb-1.5">
                {eyebrow}
              </p>
            )}
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-none tracking-tight truncate">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={href}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-tight hover:bg-black transition-colors"
            >
              Shop now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Carrusel ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse aspect-square" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
            <div className="-ml-3 md:-ml-5 flex">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="min-w-0 shrink-0 grow-0 basis-[44%] sm:basis-[40%] md:basis-1/3 xl:basis-1/4 pl-3 md:pl-5"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA mobile */}
        <div className="mt-6 sm:hidden">
          <Link
            href={href}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gray-900 text-white text-sm font-black uppercase tracking-tight"
          >
            Shop now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
