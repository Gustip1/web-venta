"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Product } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useComingSoon } from '@/components/ComingSoonProvider';
import { getCardPriceMultiplier } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';

interface ProductCardProps {
  product: Product;
  size?: 'normal' | 'large';
}

type InfoPopover = 'usd' | 'installments' | null;

export function ProductCard({ product, size = 'normal' }: ProductCardProps) {
  const [loaded, setLoaded]     = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoPopover>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!activeInfo) return;
    const handleOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActiveInfo(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeInfo]);
  const images                  = product.images || [];
  const primary                 = images[0];
  const secondary               = images[1]; // imagen para el swap en hover (estilo Shopify)
  const { rate: dolarOficial }  = useDolarRate();
  const { active: promoOn }     = useInstallmentsPromo();
  // Marcado como próximo ingreso desde /admin/proximos (con fecha estimada opcional)
  const { isComingSoon: comingSoon, eta: comingSoonEta } = useComingSoon(product.id);

  const totalStock = useMemo(() => {
    // undefined = no se pidieron variantes en este query (no hay dato, no asumimos agotado).
    // [] = se pidieron y no hay ninguna: el producto está realmente sin stock.
    if (product.product_variants === undefined) return null;
    return product.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  }, [product.product_variants]);

  const isSoldOut = totalStock !== null && totalStock <= 0;

  const availableSizes = useMemo(() => {
    if (!product.product_variants) return [];
    return product.product_variants
      .filter(v => (v.stock ?? 0) > 0)
      .map(v => v.size)
      .filter(Boolean) as string[];
  }, [product.product_variants]);

  const hasSale     = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);
  const priceInArs  = activePrice * dolarOficial;
  const cardMult    = getCardPriceMultiplier(promoOn);
  const cardArs     = priceInArs * cardMult;

  const categoryLabel =
    product.category === 'streetwear' && product.subcategory
      ? `${product.subcategory}`
      : product.category;

  return (
    <Link
      ref={cardRef}
      href={`/producto/${product.slug}`}
      onClick={() => trackEvent('product_card_click', 'discovery', { slug: product.slug })}
      className="group block"
    >
      {/* ── Imagen (swap en hover estilo Shopify) ── */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-gray-50 border border-gray-100 transition-shadow duration-300 group-hover:shadow-soft">
        {/* El esqueleto solo pulsa mientras hay una imagen real cargando; si no
            hay imagen o falló, no queda pulsando para siempre. */}
        {!!primary?.url && !imgError && !loaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {(!primary?.url || imgError) && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 sm:w-8 sm:h-8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {primary?.url && !imgError && (
          <Image
            src={primary.url}
            alt={primary.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={85}
            className={cn(
              'object-contain transition-all duration-700 ease-out',
              loaded ? 'opacity-100' : 'opacity-0',
              // al pasar el mouse la primaria se desvanece si hay una segunda imagen
              secondary?.url && 'group-hover:opacity-0',
              'group-hover:scale-[1.03]',
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Imagen secundaria: aparece con crossfade suave al hacer hover */}
        {secondary?.url && (
          <Image
            src={secondary.url}
            alt={secondary.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={85}
            className="object-contain opacity-0 scale-[1.03] transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-100"
          />
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-gray-900 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest">
              Agotado
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {comingSoon && (
            <span className="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">
              🚚 En camino{comingSoonEta && ` · ${comingSoonEta}`}
            </span>
          )}
          {hasSale && !isSoldOut && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">
              SALE
            </span>
          )}
          {product.is_new && !isSoldOut && !comingSoon && (
            <span className="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">
              Nuevo
            </span>
          )}
        </div>

      </div>

      {/* ── Info ── */}
      <div className="pt-3">
        <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] font-bold mb-1">
          {categoryLabel}
        </p>

        <h3 className={cn(
          'font-bold text-gray-900 uppercase tracking-wide leading-tight line-clamp-2 mb-2 group-hover:text-gray-500 transition-colors',
          size === 'large' ? 'text-sm' : 'text-xs',
        )}>
          {product.title}
        </h3>

        {availableSizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {availableSizes.slice(0, 4).map(s => (
              <span key={s} className="text-[9px] font-bold text-gray-500 border border-gray-300 px-1.5 py-0.5">
                {s}
              </span>
            ))}
            {availableSizes.length > 4 && (
              <span className="text-[9px] text-gray-400 font-bold self-center">+{availableSizes.length - 4}</span>
            )}
          </div>
        )}

        <div className="space-y-1">
          {/* USD — precio principal */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              'font-black tracking-tight',
              size === 'large' ? 'text-2xl' : 'text-lg',
              hasSale ? 'text-red-600' : 'text-gray-900',
            )}>
              ${activePrice.toFixed(2)}
              <span className="text-[10px] text-gray-400 font-black ml-0.5 align-top">USD</span>
            </span>
            {hasSale && (
              <span className="text-xs text-gray-400 line-through font-bold">
                ${Number(product.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* ARS — mismo tamaño que el USD */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn(
              'font-black tracking-tight',
              size === 'large' ? 'text-2xl' : 'text-lg',
              hasSale ? 'text-red-600' : 'text-gray-900',
            )}>
              {formatCurrency(priceInArs)}
            </span>
            {hasSale && (
              <span className="text-xs text-gray-400 line-through font-bold">
                {formatCurrency(Number(product.price) * dolarOficial)}
              </span>
            )}
          </div>

          {/* Aclaración: precios en USD, conversión a cambio oficial */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveInfo((v) => (v === 'usd' ? null : 'usd'));
              }}
              className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide hover:text-gray-600 transition-colors"
            >
              <Info className="w-3 h-3" />
              Precios en USD
            </button>
            {activeInfo === 'usd' && (
              <div className="mt-1 w-full rounded-lg bg-gray-900 text-white text-[11px] font-medium leading-snug p-2.5">
                Todos los precios están expresados en USD. Las conversiones a pesos son al cambio oficial.
              </div>
            )}
          </div>

          {/* Tarjeta 3 cuotas — clickeable, comparte la aclaración con el de arriba */}
          {!isSoldOut && (
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveInfo((v) => (v === 'installments' ? null : 'installments'));
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black',
                  promoOn ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-100 text-gray-700',
                )}
              >
                {promoOn && '🔥'} 3 × {formatCurrency(cardArs / 3)}
                <span className="font-bold opacity-70">
                  {promoOn ? 'sin recargo' : 'c/ 10% recargo'}
                </span>
              </button>
              {activeInfo === 'installments' && (
                <div className="mt-1 w-full rounded-lg bg-gray-900 text-white text-[11px] font-medium leading-snug p-2.5">
                  {promoOn
                    ? 'Promo activa: 3 cuotas sin interés, al mismo precio que efectivo/transferencia.'
                    : 'Pagando en 3 cuotas con tarjeta se aplica un 10% de recargo sobre el precio base.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
