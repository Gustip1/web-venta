"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Brand } from '@/types/db';
import { ArrowRight } from 'lucide-react';

export function BrandCarousel() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');
      if (data) setBrands(data as Brand[]);
    })();
  }, []);

  if (brands.length === 0) return null;

  const items = [...brands, ...brands, ...brands];

  return (
    <section className="bg-white py-12 md:py-16 border-t border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4 mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Nuestras marcas</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              Marcas
            </h2>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
          >
            Ver todo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-4 animate-marquee-brands">
          {items.map((brand, i) => (
            <Link
              key={`${brand.id}-${i}`}
              href={`/productos?brand=${brand.slug}`}
              className="group shrink-0 flex items-center justify-center px-8 py-5 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 min-w-[160px]"
            >
              <span className="text-gray-900 font-black text-lg uppercase tracking-tight group-hover:scale-105 transition-transform duration-300">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
