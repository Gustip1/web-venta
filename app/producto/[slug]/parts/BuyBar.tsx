"use client";
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductVariant } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { trackEvent } from '@/lib/analytics/track';

/**
 * Barra de compra rápida fija al pie (mobile y desktop). Permite elegir talle
 * y agregar al carrito sin scrollear hasta la sección de compra: al entrar al
 * producto el botón ya está a mano. Se oculta sola cuando esa sección entra en
 * pantalla, para no duplicar controles.
 */
export function BuyBar({
  product,
  variants,
  priceUsd,
  priceArs,
  targetId,
}: {
  product: Product;
  variants: ProductVariant[];
  priceUsd: number;
  priceArs: number;
  targetId: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState('');
  const [askSize, setAskSize] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const availableVariants = useMemo(
    () => variants.filter((v) => (v.stock ?? 0) > 0),
    [variants]
  );

  useEffect(() => setMounted(true), []);

  // Con un solo talle disponible no tiene sentido pedirlo: se preselecciona
  // y agregar al carrito queda a un toque.
  useEffect(() => {
    if (availableVariants.length === 1) setSize(availableVariants[0].size);
  }, [availableVariants]);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  if (!mounted) return null;

  const soldOut = availableVariants.length === 0;

  const handleAdd = () => {
    if (soldOut) return;
    if (!size) {
      setAskSize(true);
      return;
    }
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: priceUsd,
        imageUrl: product.images?.[0]?.url ?? null,
        size,
      },
      1
    );
    trackEvent('add_to_cart', 'ecommerce', {
      slug: product.slug,
      title: product.title,
      size,
      quantity: 1,
      price: priceUsd,
      source: 'buybar',
    });
    setAskSize(false);
    openCart();
  };

  const selectSize = (s: string) => {
    setSize(s);
    setAskSize(false);
  };

  // Portal a <body>: el contenedor de la página tiene una animación con
  // transform, y un ancestro con transform hace que position:fixed se ancle
  // al contenedor en vez de a la pantalla (la barra quedaba abajo del todo
  // del contenido en lugar de pegada al viewport).
  return createPortal(
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:py-3 transition-transform duration-300',
        hidden && 'translate-y-full'
      )}
    >
      <div className="max-w-lg lg:max-w-5xl mx-auto">
        {/* Talles rápidos — en mobile se despliegan al tocar Agregar; en
            desktop van siempre en línea junto al botón */}
        {!soldOut && availableVariants.length > 1 && (
          <div
            className={cn(
              'lg:hidden flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              !askSize && !size && 'hidden'
            )}
          >
            <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-gray-500">
              Talle
            </span>
            {availableVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => selectSize(v.size)}
                className={cn(
                  'shrink-0 min-w-[44px] px-3 py-1.5 rounded-lg border-2 text-sm font-black transition-colors',
                  size === v.size
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              >
                {v.size}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 lg:gap-6">
          {/* Título — solo desktop, en mobile el espacio es del precio */}
          <p className="hidden lg:block flex-1 min-w-0 truncate text-base font-black text-gray-900 uppercase tracking-tight">
            {product.title}
          </p>

          <div className="min-w-0">
            <p className="text-lg font-black text-gray-900 leading-tight truncate">
              {formatCurrency(priceArs)}
            </p>
            <p className="text-[11px] font-bold text-gray-500 leading-tight">
              ${priceUsd.toFixed(2)} USD · transf. / efectivo
            </p>
          </div>

          {/* Talles en línea (desktop) */}
          {!soldOut && availableVariants.length > 1 && (
            <div className="hidden lg:flex items-center gap-1.5 max-w-[40%] overflow-x-auto">
              {availableVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectSize(v.size)}
                  className={cn(
                    'shrink-0 min-w-[42px] px-3 py-2 rounded-lg border-2 text-sm font-black transition-colors',
                    size === v.size
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
                  )}
                >
                  {v.size}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={soldOut}
            className={cn(
              'shrink-0 px-5 lg:px-10 py-3 rounded-xl text-sm font-black uppercase tracking-tight transition-all',
              soldOut
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black active:scale-95'
            )}
          >
            {soldOut ? 'Sin stock' : size ? 'Agregar' : 'Elegir talle'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
