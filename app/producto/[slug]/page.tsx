"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, ProductVariant } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { AddToCart } from './parts/AddToCart';
import { MakeOffer } from './parts/MakeOffer';
import { BuyBar } from './parts/BuyBar';
import { RelatedProducts } from './parts/RelatedProducts';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useComingSoon } from '@/components/ComingSoonProvider';
import { Shield, Truck, Star, Banknote, CreditCard } from 'lucide-react';
import { getCardPriceMultiplier } from '@/lib/promo';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const supabase = createBrowserClient();
  const { rate: dolarOficial } = useDolarRate();
  const { active: promoOn, enabled: cuotasOn, comingSoon: cuotasSoon, soonLabel } = useInstallmentsPromo();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [offersEnabled, setOffersEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isComingSoon: comingSoonFlag, eta: comingSoonEta } = useComingSoon(product?.id);

  useEffect(() => {
    const loadProduct = async () => {
      // ilike + trim: tolera links viejos con mayúsculas/espacios distintos al slug real
      const cleanSlug = String(params.slug || '').trim();
      const [{ data: productData }, { data: offersRow }] = await Promise.all([
        supabase.from('products').select('*').ilike('slug', cleanSlug).maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'offers_enabled').maybeSingle(),
      ]);

      setOffersEnabled(Boolean((offersRow?.value as { active?: boolean } | null)?.active));

      if (!productData) {
        setLoading(false);
        return;
      }

      setProduct(productData as unknown as Product);

      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productData.id)
        .order('size', { ascending: true });

      setVariants((variantsData || []) as unknown as ProductVariant[]);
      setLoading(false);
    };

    loadProduct();
  }, [params.slug, supabase]);


  if (loading) return (
    <div className="max-w-7xl mx-auto bg-white min-h-screen" aria-busy="true" aria-label="Cargando producto">
      <div className="skeleton h-4 w-48 rounded mb-6" />
      <div className="grid gap-3 md:gap-8 lg:gap-16 md:grid-cols-2">
        <div className="skeleton aspect-[4/5] w-full rounded-xl md:rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-10 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-12 w-2/3 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-4xl">🔍</span>
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Producto no encontrado</h2>
      <p className="text-gray-500 font-bold mb-6 max-w-sm">
        Este link puede estar desactualizado. Puede que el producto haya cambiado o ya no esté disponible —
        pero seguro encontrás algo parecido en el catálogo.
      </p>
      <Link
        href="/productos"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-colors"
      >
        Ver catálogo
      </Link>
    </div>
  );

  const hasSale    = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);
  const priceInArs = activePrice * dolarOficial;
  const isComingSoon = comingSoonFlag;

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn bg-white min-h-screen overflow-x-hidden pb-24">
      {/* Breadcrumb */}
      <nav className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 font-bold" aria-label="Ruta de navegación">
        <Link href="/" className="hover:text-gray-900 transition-colors">Inicio</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/productos?${product.category}`} className="hover:text-gray-900 transition-colors capitalize">
          {product.category}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-900 font-black truncate max-w-[120px] md:max-w-[200px]" aria-current="page">{product.title}</span>
      </nav>

      <div className="grid gap-3 md:gap-8 lg:gap-16 md:grid-cols-2">
        {/* Image section */}
        <div className="md:sticky md:top-8 md:self-start">
          <ImageCarousel images={product.images || []} />
        </div>
        
        {/* Product info section */}
        <div className="space-y-3 md:space-y-6">
          {/* Category badge */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-wide border border-gray-200">
              {product.category}
            </span>
            {hasSale && (
              <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-wide border border-red-200">
                🔥 Oferta
              </span>
            )}
            {isComingSoon && (
              <span className="inline-flex items-center rounded-full bg-gray-900 text-white px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-wide">
                🚚 Próximo ingreso{comingSoonEta && ` · ${comingSoonEta}`}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
            {product.title}
          </h1>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-[10px] md:text-sm text-gray-500 font-bold">(Verificado)</span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap font-semibold text-sm md:text-base">
              {product.description}
            </p>
          )}

          {/* Price */}
          {(() => {
            const cardPriceArs = activePrice * getCardPriceMultiplier(promoOn) * dolarOficial;
            const installment = cardPriceArs / 3;
            const discountPct = hasSale
              ? Math.round((1 - activePrice / Number(product.price)) * 100)
              : 0;

            return (
              <div className="space-y-4 pb-4 md:pb-6 border-b border-gray-200">
                {/* Precio principal (USD) */}
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                      ${activePrice.toFixed(2)}
                      <span className="text-base md:text-xl text-gray-400 font-black ml-1">USD</span>
                    </span>
                    {hasSale && (
                      <span className="text-lg md:text-2xl font-black text-gray-400 line-through">
                        ${Number(product.price).toFixed(2)}
                      </span>
                    )}
                    {hasSale && discountPct > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-500 text-white px-2.5 py-1 text-xs font-black uppercase tracking-wide">
                        -{discountPct}%
                      </span>
                    )}
                  </div>
                  {hasSale && (
                    <p className="mt-1.5 text-xs font-black text-red-500 uppercase tracking-wide">
                      ¡Rebaja! Ahorrás ${(Number(product.price) - activePrice).toFixed(0)} USD
                    </p>
                  )}
                </div>

                {/* Métodos de pago — precios en ARS.
                    Van una debajo de otra hasta que la columna de info es
                    ancha de verdad: en tablet, con la ficha ya en dos
                    columnas, dos tarjetas lado a lado dejaban ~180px cada una
                    y el importe se cortaba a la mitad. */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* Transferencia / Efectivo */}
                  <div className="relative rounded-2xl border-2 border-gray-900 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 shrink-0">
                        <Banknote className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[11px] md:text-xs font-black uppercase tracking-wide text-gray-500 leading-tight">
                        Transferencia<br className="hidden sm:block" /> / Efectivo
                      </p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight break-words">
                      {formatCurrency(priceInArs)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-900 font-bold uppercase tracking-wide">
                      Mejor precio
                    </p>
                  </div>

                  {/* Cuotas en "próximamente": se anuncian sin precio ni opción de pago */}
                  {cuotasSoon && (
                    <div className="relative rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-gray-100">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-[11px] md:text-xs font-black uppercase tracking-wide text-gray-500 leading-tight">
                          Tarjeta
                        </p>
                      </div>
                      <p className="text-lg md:text-xl font-black tracking-tight text-gray-500">{soonLabel}</p>
                    </div>
                  )}

                  {/* Tarjeta — 3 cuotas */}
                  {cuotasOn && (
                  <div className={cn(
                    'relative rounded-2xl border p-4',
                    promoOn ? 'border-2 border-red-600 bg-red-50' : 'border-gray-200 bg-white',
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                        promoOn ? 'bg-red-600' : 'bg-gray-100',
                      )}>
                        <CreditCard className={cn('w-4 h-4', promoOn ? 'text-white' : 'text-gray-900')} />
                      </div>
                      <p className="text-[11px] md:text-xs font-black uppercase tracking-wide text-gray-500 leading-tight">
                        Tarjeta<br className="hidden sm:block" /> 3 cuotas s/ interés
                      </p>
                      {promoOn && (
                        <span className="ml-auto inline-flex px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider self-start animate-pulse">
                          🔥 Promo
                        </span>
                      )}
                    </div>
                    <p className={cn('text-2xl md:text-3xl font-black tracking-tight break-words', promoOn ? 'text-red-600' : 'text-gray-900')}>
                      3 × {formatCurrency(installment)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 font-bold">
                      {promoOn ? 'Sin recargo' : `Total ${formatCurrency(cardPriceArs)}`}
                    </p>
                  </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 font-medium">
                  Precios en pesos calculados al tipo de cambio actual. El valor en USD es de referencia.
                </p>
              </div>
            );
          })()}

          {/* Hacer una oferta — negociación por WhatsApp, no crea ninguna orden. Se puede activar/desactivar desde /admin/ajustes */}
          {offersEnabled && <MakeOffer productTitle={product.title} productSlug={product.slug} />}

          {/* Aviso de compra anticipada — producto en camino al showroom */}
          {isComingSoon && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-gray-900 bg-gray-50 p-4">
              <span className="text-2xl" aria-hidden="true">🚚</span>
              <div>
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  En camino al showroom{comingSoonEta && ` · Llega ${comingSoonEta}`}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-bold mt-0.5">
                  Este producto todavía no llegó{comingSoonEta ? `, lo esperamos ${comingSoonEta}` : ''}.
                  Podés comprarlo ahora de forma anticipada y te avisamos apenas esté disponible
                  para retiro o envío.
                </p>
              </div>
            </div>
          )}

          {/* Add to cart section */}
          <div id="comprar-section" className="py-2 md:py-4 scroll-mt-24">
            <AddToCart product={product} variants={variants} />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 py-4 md:py-6 border-t border-gray-200">
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-900 shrink-0">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-gray-900 truncate">100% Original</p>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold truncate">Garantía</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-900 shrink-0">
                <Truck className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-gray-900 truncate">Envío seguro</p>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold truncate">Todo el país</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-900 shrink-0">
                <span className="text-sm md:text-lg">💳</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-gray-900 truncate">3 cuotas</p>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold truncate">Sin interés</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-900 shrink-0">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-gray-900 truncate">Verificado</p>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold truncate">Auténtico</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Productos relacionados: evita que la ficha sea un callejón sin salida */}
      <RelatedProducts productId={product.id} category={product.category} brand={product.brand} />

      {/* Barra de compra fija — mobile y desktop, se oculta cuando la sección de compra está a la vista */}
      <BuyBar
        product={product}
        variants={variants}
        priceUsd={activePrice}
        priceArs={priceInArs}
        targetId="comprar-section"
      />
    </div>
  );
}
