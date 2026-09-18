"use client";
import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from '@/types/db';
import { cn } from '@/lib/utils';

export function ImageCarousel({ images }: { images: ProductImage[] }) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Main image carousel */}
      <div className="relative group rounded-xl md:rounded-2xl overflow-hidden bg-gray-50 shadow-sm border border-gray-200 mx-2 md:mx-0">
        <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
          <ul className="flex">
            {images.map((img, idx) => (
              <li key={img.url} className="min-w-0 shrink-0 grow-0 basis-full">
                {/* Aspect ratio cuadrado en móvil para mejor visualización del producto */}
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Image 
                    src={img.url} 
                    alt={img.alt || `Imagen ${idx + 1}`} 
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={85}
                    priority={idx === 0}
                    className={cn(
                      "object-contain transition-all duration-500",
                      imageLoaded[idx] ? "opacity-100 scale-100" : "opacity-0 scale-105"
                    )}
                    onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
                  />
                  {!imageLoaded[idx] && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Navigation arrows - always visible on mobile, hover on desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full bg-white/95 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4 md:h-6 md:w-6 text-gray-900" strokeWidth={2.5} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full bg-white/95 shadow-lg border border-gray-200 transition-all hover:scale-110 active:scale-95"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4 md:h-6 md:w-6 text-gray-900" strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Image counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-10 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-black/75 text-white text-xs md:text-sm font-medium backdrop-blur-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>
      
      {/* Dots de navegación — sólo móvil (las miniaturas quedan para tablet+) */}
      {images.length > 1 && (
        <div className="flex md:hidden items-center justify-center gap-1.5">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Ir a la imagen ${idx + 1}`}
              onClick={() => api?.scrollTo(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                selectedIndex === idx ? 'w-5 bg-gray-900' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              )}
            />
          ))}
        </div>
      )}

      {/* Thumbnail navigation - oculto en móvil, visible en tablet+ */}
      {images.length > 1 && (
        <div className="hidden md:flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide px-2 md:px-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={cn(
                "relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200",
                selectedIndex === idx 
                  ? 'ring-2 ring-black ring-offset-2 scale-105 border-black' 
                  : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
              )}
              aria-label={`Ver imagen ${idx + 1}`}
              onClick={() => api?.scrollTo(idx)}
            >
              <img
                src={img.url}
                alt={img.alt || `Miniatura ${idx + 1}`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
