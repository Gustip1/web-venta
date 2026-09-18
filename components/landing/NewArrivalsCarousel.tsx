"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { useCallback } from 'react';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface NewArrivalsCarouselProps {
  /** Productos ya resueltos en el servidor: aparecen en el primer paint */
  products: Product[];
  /**
   * true  → productos marcados como "nuevo ingreso" desde el admin (is_new)
   * false → fallback: lo último del catálogo, para que la home nunca quede sin productos
   */
  curated: boolean;
}

export function NewArrivalsCarousel({ products, curated }: NewArrivalsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: products.length > 4,
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps',
      dragFree: true,
    },
    [Autoplay({ delay: 3500, stopOnMouseEnter: true, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (products.length === 0) return null;

  const allHref = curated ? '/nuevos-ingresos' : '/productos';

  return (
    <section className="bg-white py-10 md:py-16" aria-labelledby="new-arrivals-title">
      <div className="max-w-[1400px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-10">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">
              {curated ? 'Últimos ingresos' : 'Lo último del catálogo'}
            </p>
            <h2 id="new-arrivals-title" className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Recién llegados
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={allHref}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-tight hover:bg-black transition-colors"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
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

        {/* CTA mobile */}
        <div className="mt-6 sm:hidden">
          <Link
            href={allHref}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gray-900 text-white text-sm font-black uppercase tracking-tight"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
