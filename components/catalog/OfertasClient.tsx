"use client";
import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductsClient';

export function OfertasClient() {
  const supabase = useRef(createBrowserClient());
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.current
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('on_sale', true)
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      setProducts((data || []) as unknown as Product[]);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header súper llamativo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-black via-gray-900 to-red-700 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full animate-pulse">
              <span className="text-4xl">🔥</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
                ¡Ofertas Especiales!
              </h1>
              <p className="text-gray-300 text-lg font-medium mt-1">
                Los mejores precios en productos 100% originales
              </p>
            </div>
          </div>

          {!loading && products.length > 0 && (
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-white font-bold text-sm">
                🎯 {products.length} {products.length === 1 ? 'producto' : 'productos'} en oferta
              </p>
            </div>
          )}
        </div>

        {/* Efectos decorativos */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Contenido */}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😔</div>
          <p className="text-xl text-gray-700 font-semibold mb-2">No hay ofertas disponibles en este momento</p>
          <p className="text-gray-400">Volvé pronto para descubrir nuevas ofertas</p>
        </div>
      ) : (
        <div>
          {/* Info adicional */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-gray-900 font-bold mb-1">¡Aprovecha estas ofertas!</h3>
                <p className="text-gray-600 text-sm">
                  Todos nuestros productos son 100% originales, con envío a todo el país.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de productos — misma grilla que el catálogo para que las
              imágenes ocupen el mismo espacio en toda la web */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4 md:gap-x-8 md:gap-y-14">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

