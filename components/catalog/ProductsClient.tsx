"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Brand, Product, STREETWEAR_SUBCATEGORIES, StreetWearSubcategory } from '@/types/db';
import { ProductCard } from './ProductCard';
import { X, SlidersHorizontal, Grid3X3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Skeleton con la misma silueta que ProductCard para evitar saltos de layout */
export function ProductGridSkeleton({ count = 8, large = false }: { count?: number; large?: boolean }) {
  return (
    <div
      className={cn(
        'grid gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14',
        large
          ? 'grid-cols-2 md:grid-cols-3'
          : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-square w-full rounded-xl" />
          <div className="skeleton mt-3 h-2.5 w-1/3 rounded" />
          <div className="skeleton mt-2 h-3.5 w-3/4 rounded" />
          <div className="skeleton mt-2 h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const categoryConfig = {
  sneakers: {
    title: 'SNEAKERS',
    gradient: 'from-blue-600 via-purple-600 to-pink-600',
    accent: 'bg-blue-500',
    pattern: 'sneakers',
    emoji: '👟',
    filterColor: 'blue'
  },
  streetwear: {
    title: 'STREETWEAR',
    gradient: 'from-orange-500 via-red-500 to-pink-600',
    accent: 'bg-purple-500',
    pattern: 'streetwear',
    emoji: '🔥',
    filterColor: 'purple'
  }
};

const subcategoryLabels: Record<string, string> = {
  remeras: 'REMERAS',
  hoodies: 'HOODIES / ABRIGOS',
  pantalones: 'PANTALONES',
  accesorios: 'ACCESORIOS',
};

export function ProductsClient({ category, subcategory, brand }: { category?: 'sneakers' | 'streetwear'; subcategory?: StreetWearSubcategory; brand?: string }) {
  const supabase = useRef(createBrowserClient());
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 350);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<{ size: string; count: number }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState(brand || '');
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState<'normal' | 'large'>('normal');

  const pageSize = dq ? 24 : 60;

  const title = useMemo(
    () => {
      if (brand) return brand.replace(/-/g, ' ').toUpperCase();
      if (subcategory && subcategoryLabels[subcategory]) return subcategoryLabels[subcategory];
      return category ? categoryConfig[category].title : 'Productos';
    },
    [category, subcategory, brand]
  );

  const config = category ? categoryConfig[category] : null;

  const load = async (reset = true) => {
    setLoading(true);
    const from = reset ? 0 : (page + 1) * pageSize;
    const to = from + pageSize - 1;
    
    let variantIdsForQ: string[] = [];
    if (dq) {
      // Permite buscar por talle: "42", "talle 42", "M", "talle M"…
      const sizeToken = dq.replace(/^(talles?|sizes?|t)\s+/i, '').trim();
      const { data: vrows } = await supabase.current
        .from('product_variants')
        .select('product_id')
        // coincidencia exacta de talle (case-insensitive)
        .ilike('size', sizeToken);
      variantIdsForQ = Array.from(new Set((vrows || []).map((r: any) => r.product_id)));
    }

    let query = supabase.current
      .from('products')
      .select('*, product_variants(stock,size)', { count: 'exact' })
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (category) query = query.eq('category', category);
    if (subcategory) query = query.eq('subcategory', subcategory);
    if (selectedBrand) query = query.eq('brand', selectedBrand);

    if (dq) {
      const like = `%${dq}%`;
      const orParts = [`title.ilike.${like}`, `slug.ilike.${like}`, `brand.ilike.${like}`];
      if (variantIdsForQ.length > 0) {
        orParts.push(`id.in.(${variantIdsForQ.join(',')})`);
      }
      query = query.or(orParts.join(','));
    }
    
    if (selectedSizes.length > 0) {
      const { data: pidRows } = await supabase.current
        .from('product_variants')
        .select('product_id')
        .in('size', selectedSizes);
      const ids = Array.from(new Set((pidRows || []).map((r: any) => r.product_id)));
      if (ids.length === 0) {
        setProducts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      query = query.in('id', ids);
    }
    
    query = query.range(from, to);
    const { data, count } = await query;
    const list = (data || []) as unknown as Product[];
    setProducts((prev) => (reset ? list : [...prev, ...list]));
    setHasMore(((count || 0) > to + 1));
    setLoading(false);
    if (!reset) setPage((p) => p + 1);
    else setPage(0);
  };

  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();
  
  useEffect(() => {
    setQ(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    (async () => {
      let productIds: string[] = [];
      if (category) {
        let prodQuery = supabase.current
          .from('products')
          .select('id')
          .eq('category', category)
          .eq('active', true);
        if (subcategory) prodQuery = prodQuery.eq('subcategory', subcategory);
        const { data: prod } = await prodQuery.limit(1000);
        productIds = (prod || []).map((p: any) => p.id);
      }

      let variantsQuery = supabase.current
        .from('product_variants')
        .select('size, product_id');
      if (productIds.length > 0) variantsQuery = variantsQuery.in('product_id', productIds);

      const { data: vars } = await variantsQuery;
      const counts = new Map<string, number>();
      (vars || []).forEach((v: any) => {
        const key = (v.size || '').toString();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      let sizes = Array.from(counts.entries()).map(([size, count]) => ({ size, count }));

      if (category === 'sneakers') {
        const numeric = sizes.filter((s) => /^\d+(?:[.,]\d+)?$/.test(String(s.size)));
        sizes = numeric.sort(
          (a, b) =>
            parseFloat(String(a.size).replace(',', '.')) -
            parseFloat(String(b.size).replace(',', '.'))
        );
        setAvailableSizes(sizes);
      } else if (category === 'streetwear') {
        const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const textual = sizes
          .map((s) => ({ size: String(s.size).toUpperCase(), count: s.count }))
          .filter((s) => order.includes(s.size));
        textual.sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
        setAvailableSizes(textual);
      } else {
        setAvailableSizes([]);
      }
      setSelectedSizes([]);

      // Load brands for streetwear filter
      if (category === 'streetwear') {
        const { data: brandsData } = await supabase.current
          .from('brands')
          .select('*')
          .eq('active', true)
          .order('name');
        setAvailableBrands((brandsData || []) as Brand[]);
      } else {
        setAvailableBrands([]);
      }
    })();
  }, [category, subcategory]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory, dq, selectedSizes, selectedBrand]);

  return (
    <div className="space-y-6 animate-fadeIn bg-white">
      {/* Simple category title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
          {config ? config.title : title}
        </h1>
      </div>

      {/* Subcategory tabs for streetwear */}
      {category === 'streetwear' && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/productos?streetwear"
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              !subcategory
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            )}
          >
            Todo
          </Link>
          {STREETWEAR_SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.value}
              href={`/productos?streetwear&sub=${sub.value}`}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5",
                subcategory === sub.value
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              )}
            >
              <span>{sub.icon}</span>
              {sub.label}
            </Link>
          ))}
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Filter toggle button */}
          {(availableSizes.length > 0 || availableBrands.length > 0) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                showFilters || selectedSizes.length > 0 || selectedBrand
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtrar
              {(selectedSizes.length > 0 || selectedBrand) && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                  {selectedSizes.length + (selectedBrand ? 1 : 0)}
                </span>
              )}
            </button>
          )}

          {/* Active filters — limpiar */}
          {(selectedSizes.length > 0 || selectedBrand) && (
            <button
              onClick={() => { setSelectedSizes([]); setSelectedBrand(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
        
        {/* Grid toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setGridSize('normal')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              gridSize === 'normal' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
            aria-label="Grid normal"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize('large')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              gridSize === 'large' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
            aria-label="Grid grande"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (availableSizes.length > 0 || availableBrands.length > 0) && (
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 animate-fadeIn space-y-4">
          {availableSizes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Talle</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(({ size }) => {
                  const isActive = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      className={cn(
                        "min-w-[3rem] px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-gray-900 text-white shadow-md scale-105"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                      )}
                      onClick={() =>
                        setSelectedSizes((prev) =>
                          prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                        )
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {availableBrands.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Marca</p>
              <div className="flex flex-wrap gap-2">
                {availableBrands.map((b) => (
                  <button
                    key={b.id}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      selectedBrand === b.slug
                        ? "bg-gray-900 text-white shadow-md scale-105"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    )}
                    onClick={() => setSelectedBrand(prev => prev === b.slug ? '' : b.slug)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state — skeleton con la silueta real del grid */}
      {loading && products.length === 0 && (
        <ProductGridSkeleton count={8} large={gridSize === 'large'} />
      )}
      
      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No encontramos productos</h3>
          <p className="text-gray-500 max-w-md">
            Intenta ajustar los filtros o buscar con otros términos
          </p>
          {(selectedSizes.length > 0 || selectedBrand) && (
            <button
              onClick={() => { setSelectedSizes([]); setSelectedBrand(''); }}
              className="mt-4 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-black active:scale-[0.98] transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Products grid */}
      <div className={cn(
        "grid gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14",
        gridSize === 'large'
          ? "grid-cols-2 md:grid-cols-3"
          : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      )}>
        {products.map((p, idx) => (
          <div 
            key={p.id} 
            className="animate-fadeIn"
            style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
          >
            <ProductCard product={p} size={gridSize} />
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            className="flex items-center gap-2 rounded-full bg-gray-900 text-white px-8 py-3.5 text-sm font-medium hover:bg-gray-800 transition-all hover:scale-105 shadow-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={loading}
            onClick={() => load(false)}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cargando...
              </>
            ) : (
              'Cargar más productos'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
