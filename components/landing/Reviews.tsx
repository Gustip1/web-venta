"use client";

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star } from 'lucide-react';

export type Review = {
  id: string;
  name: string;
  rating: number; // 1..5
  text: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating
              ? 'w-4 h-4 fill-amber-400 text-amber-400'
              : 'w-4 h-4 fill-gray-200 text-gray-200'
          }
        />
      ))}
    </div>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', dragFree: true },
    [Autoplay({ delay: 2800, stopOnMouseEnter: true, stopOnInteraction: false })]
  );

  if (reviews.length === 0) return null;

  // Duplicamos si hay pocas para que el loop se vea continuo
  const items = reviews.length < 4 ? [...reviews, ...reviews] : reviews;

  return (
    <section className="bg-gray-50 py-12 md:py-20 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Lo que dicen</p>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
            Opiniones de clientes
          </h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-4">
            {items.map((r, i) => (
              <div
                key={`${r.id}-${i}`}
                className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-1/2 lg:basis-1/3 pl-4"
              >
                <div className="h-full bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
                  <Stars rating={r.rating} />
                  <p className="text-sm text-gray-600 leading-relaxed font-medium flex-1">
                    “{r.text}”
                  </p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    {r.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
