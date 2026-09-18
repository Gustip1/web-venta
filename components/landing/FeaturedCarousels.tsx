"use client";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

function ProductSlide({ product }: { product: Product }) {
  const { rate: dolarOficial } = useDolarRate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const hasSale     = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-sm" />}
        {product.images?.[0]?.url && (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt || product.title}
            fill
            sizes="300px"
            quality={85}
            className={cn(
              "object-contain transition-opacity duration-500",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {hasSale && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-gray-900 text-[9px] font-black uppercase tracking-widest">
            SALE
          </span>
        )}
      </div>
      <div className="pt-3">
        <p className="text-[9px] text-gray-900/30 uppercase tracking-[0.2em] font-bold mb-1">{product.category}</p>
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide line-clamp-2 mb-1.5 group-hover:text-gray-900/70 transition-colors">
          {product.title}
        </h3>
        {hasSale && (
          <p className="text-xs text-gray-400 line-through">${Number(product.price).toFixed(0)} USD</p>
        )}
        <p className={cn('text-base font-black tracking-tight', hasSale ? 'text-red-600' : 'text-gray-900')}>
          ${activePrice.toFixed(2)} USD
        </p>
        <p className="text-xs text-gray-500 font-medium">{formatCurrency(activePrice * dolarOficial)}</p>
      </div>
    </Link>
  );
}

function SaleSection({ products }: { products: Product[] }) {
  const [ref, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  }, [
    Autoplay({ delay: 3000, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  if (products.length === 0) return null;
  
  return (
    <section className="space-y-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🔥</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
              Ofertas especiales
            </h2>
            <p className="text-sm text-gray-500 font-bold">No te pierdas estos precios únicos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={scrollPrev}
            className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 hover:border-gray-400 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <button
            onClick={scrollNext}
            className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 hover:border-gray-400 transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-900" />
          </button>
          <Link
            href="/ofertas"
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-gray-900 text-sm font-black hover:from-red-600 hover:to-orange-600 transition-all shadow-md uppercase tracking-tight"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden -mx-4 px-4 bg-white" ref={ref}>
        <div className="-ml-4 flex">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 grow-0 basis-[75%] sm:basis-[280px] md:basis-[300px] pl-4">
              <ProductSlide product={p} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile CTA */}
      <Link
        href="/ofertas"
        className="md:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-gray-900 text-sm font-medium"
      >
        Ver todas las ofertas
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

function FeaturedSection({ title, products, type }: { title: string; products: Product[]; type: 'sneakers' | 'streetwear' }) {
  const [ref, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  }, [
    Autoplay({ delay: 3500, stopOnMouseEnter: true, stopOnInteraction: false })
  ]);
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  if (products.length === 0) return null;

  const config = type === 'sneakers' 
    ? {
        gradient: 'from-blue-500 to-cyan-500',
        icon: '👟',
        linkHref: '/productos?sneakers',
        bgIcon: 'bg-gradient-to-br from-blue-500 to-cyan-500'
      }
    : {
        gradient: 'from-purple-500 to-pink-500',
        icon: '👕',
        linkHref: '/productos?streetwear',
        bgIcon: 'bg-gradient-to-br from-purple-500 to-pink-500'
      };
  
  return (
    <section className="space-y-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${config.bgIcon} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl">{config.icon}</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-gray-500 font-bold">Productos seleccionados para ti</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={scrollPrev}
            className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 hover:border-gray-400 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <button
            onClick={scrollNext}
            className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 hover:border-gray-400 transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <Link
            href={config.linkHref}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${config.gradient} text-gray-900 text-sm font-black hover:opacity-90 transition-all shadow-md uppercase tracking-tight`}
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden -mx-4 px-4 bg-white" ref={ref}>
        <div className="-ml-4 flex">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 grow-0 basis-[75%] sm:basis-[280px] md:basis-[300px] pl-4">
              <ProductSlide product={p} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile CTA */}
      <Link
        href={config.linkHref}
        className={`md:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-gray-900 text-sm font-black uppercase tracking-tight`}
      >
        Ver todos los {type === 'sneakers' ? 'sneakers' : 'streetwear'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

function OldStockSection({ products }: { products: Product[] }) {
  const [ref, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  }, [Autoplay({ delay: 4000, stopOnMouseEnter: true, stopOnInteraction: false })]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (products.length === 0) return null;

  return (
    <section className="space-y-6 bg-white border-t border-gray-100 pt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-md">
            <span className="text-2xl">📦</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
              También disponible
            </h2>
            <p className="text-sm text-gray-500 font-bold">Stock completo · piezas que siguen esperándote</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={scrollPrev} className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-all" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>
          <button onClick={scrollNext} className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-all" aria-label="Siguiente">
            <ChevronRight className="w-5 h-5 text-gray-900" />
          </button>
          <Link href="/productos" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-all uppercase tracking-tight">
            Ver catálogo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden -mx-4 px-4" ref={ref}>
        <div className="-ml-4 flex">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 grow-0 basis-[75%] sm:basis-[280px] md:basis-[300px] pl-4">
              <ProductSlide product={p} />
            </div>
          ))}
        </div>
      </div>

      <Link href="/productos" className="md:hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-black uppercase tracking-tight">
        Ver catálogo completo <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

export function FeaturedCarousels() {
  const [sneakers, setSneakers] = useState<Product[]>([]);
  const [streetwear, setStreetwear] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [oldStock, setOldStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);

    Promise.all([
      supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .or('on_sale.eq.true,sale_price.gt.0')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('featured_sneakers', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('featured_streetwear', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*, product_variants(stock,size)')
        .eq('active', true)
        .lt('created_at', cutoff.toISOString())
        .order('created_at', { ascending: true })
        .limit(14),
    ]).then(([sale, a, b, old]) => {
      if (sale.data) setSaleProducts(sale.data as unknown as Product[]);
      if (a.data) setSneakers(a.data as unknown as Product[]);
      if (b.data) setStreetwear(b.data as unknown as Product[]);
      if (old.data) {
        // exclude products already in featured sections
        const featuredIds = new Set([
          ...(a.data || []).map((p: any) => p.id),
          ...(b.data || []).map((p: any) => p.id),
          ...(sale.data || []).map((p: any) => p.id),
        ]);
        const filtered = (old.data as unknown as Product[]).filter(p => !featuredIds.has(p.id));
        setOldStock(filtered);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl skeleton" />
              <div className="space-y-2">
                <div className="w-48 h-6 rounded skeleton" />
                <div className="w-32 h-4 rounded skeleton" />
              </div>
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="w-[280px] shrink-0 rounded-2xl overflow-hidden">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-2">
                    <div className="w-16 h-3 rounded skeleton" />
                    <div className="w-full h-4 rounded skeleton" />
                    <div className="w-24 h-5 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {saleProducts.length > 0 && <SaleSection products={saleProducts} />}
      {oldStock.length > 0 && <OldStockSection products={oldStock} />}
      {sneakers.length > 0 && <FeaturedSection title="Sneakers destacados" products={sneakers} type="sneakers" />}
      {streetwear.length > 0 && <FeaturedSection title="Streetwear destacados" products={streetwear} type="streetwear" />}
    </div>
  );
}
