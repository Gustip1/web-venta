"use client";
import { useEffect, useMemo, useState } from 'react';
import { Product, ProductVariant } from '@/types/db';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { trackEvent } from '@/lib/analytics/track';

import { useStoreConfig } from '@/components/StoreConfigProvider';
import { whatsappUrl } from '@/lib/storeConfig';
import { formatCurrency } from '@/lib/utils';

export function AddToCart({ product, variants }: { product: Product; variants: ProductVariant[] }) {
  const config = useStoreConfig();
  const [size, setSize] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const selectedVariant = useMemo(() => variants.find((v) => v.size === size) || null, [variants, size]);
  const maxQty = selectedVariant?.stock ?? 0;

  useEffect(() => {
    // Clamp qty cuando cambia el talle o el stock disponible
    if (qty > maxQty) setQty(maxQty > 0 ? maxQty : 1);
    if (qty < 1) setQty(1);
  }, [maxQty, qty]);

  const hasSale     = product.sale_price != null && Number(product.sale_price) > 0;
  const activePrice = hasSale ? Number(product.sale_price) : Number(product.price);

  const handleAdd = () => {
    if (!size) return;
    if (maxQty <= 0) return;
    const finalQty = Math.max(1, Math.min(qty, maxQty));
    const imageUrl = product.images?.[0]?.url ?? null;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: activePrice,
        imageUrl,
        size
      },
      finalQty
    );
    trackEvent('add_to_cart', 'ecommerce', {
      slug: product.slug,
      title: product.title,
      size,
      quantity: finalQty,
      price: activePrice,
    });
    openCart();
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Selector de talla */}
      <div>
        <label className="block text-xs md:text-sm font-black text-gray-900 mb-2 md:mb-3 uppercase tracking-wider">
          Selecciona tu talla
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 md:gap-3">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSize(size === v.size ? '' : v.size)}
              disabled={v.stock <= 0}
              className={`
                relative min-h-[44px] py-3 md:py-3 px-2 md:px-3 rounded-md md:rounded-lg border-2 text-sm md:text-sm font-black transition-all
                ${size === v.size
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : v.stock > 0
                    ? 'border-gray-300 bg-white text-gray-900 hover:border-gray-900 active:border-gray-900 active:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                }
              `}
            >
              {v.size}
              {v.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-gray-300 rotate-45" />
                </div>
              )}
            </button>
          ))}
        </div>
        {size && selectedVariant && (
          <p className="mt-2 text-xs text-gray-400 font-bold">
            {maxQty > 0 ? `${maxQty} unidades disponibles` : 'Sin stock'}
          </p>
        )}
      </div>

      {/* Selector de cantidad */}
      <div>
        <label className="block text-xs md:text-sm font-black text-gray-900 mb-2 md:mb-3 uppercase tracking-wider">
          Cantidad
        </label>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={!size || maxQty <= 0 || qty <= 1}
            aria-label="Disminuir cantidad"
            className="w-11 h-11 rounded-md md:rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-900 font-black hover:border-gray-900 active:border-gray-900 active:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-base md:text-lg">−</span>
          </button>
          <input
            className="w-16 h-11 text-center rounded-md md:rounded-lg border-2 border-gray-300 bg-white text-gray-900 text-base font-black focus:outline-none focus:border-gray-900"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            max={maxQty > 0 ? maxQty : undefined}
            value={qty}
            disabled={!size || maxQty <= 0}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              setQty(Math.max(1, Math.min(next, maxQty || 1)));
            }}
          />
          <button
            type="button"
            onClick={() => setQty(Math.min(maxQty, qty + 1))}
            disabled={!size || maxQty <= 0 || qty >= maxQty}
            aria-label="Aumentar cantidad"
            className="w-11 h-11 rounded-md md:rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-900 font-black hover:border-gray-900 active:border-gray-900 active:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-base md:text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Botón de agregar al carrito */}
      <Button
        onClick={handleAdd}
        disabled={!size || maxQty <= 0 || qty < 1 || qty > maxQty}
        className="w-full py-3 md:py-4 text-sm md:text-base font-black tracking-wide uppercase shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!size ? 'Selecciona una talla' : maxQty <= 0 ? 'Sin stock' : 'Agregar al carrito'}
      </Button>

      {/* WhatsApp CTA */}
      <a
        href={whatsappUrl(config,
          `Hola! Me interesa este producto: *${product.title}*\n` +
          (hasSale
            ? `Precio: ~~$${Number(product.price).toFixed(0)} USD~~ → *$${activePrice.toFixed(0)} USD* (REBAJA)\n`
            : `Precio: *$${activePrice.toFixed(0)} USD*\n`) +
          `${typeof window !== 'undefined' ? window.location.href : ''}`
        ) ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('whatsapp_click', 'contact', { slug: product.slug, source: 'pdp' })}
        className="flex items-center justify-center gap-3 w-full py-3 md:py-4 rounded-xl border-2 border-[#25D366] text-[#25D366] font-black text-sm md:text-base uppercase tracking-wide hover:bg-[#25D366] hover:text-black transition-all duration-200"
      >
        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Consultar por WhatsApp
      </a>

      {/* Información adicional - SIN MENCIONAR CAMBIOS/DEVOLUCIONES */}
      <div className="pt-3 md:pt-4 space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-500 border-t border-gray-200">
        <p className="flex items-center gap-2 font-bold">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {config.shipping.cost > 0
            ? `Envío a todo el país por ${formatCurrency(config.shipping.cost)}`
            : `Envíos a todo el país · ${config.shipping.note}`}
        </p>
        <p className="flex items-center gap-2 font-bold">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Producto 100% original garantizado
        </p>
      </div>
    </div>
  );
}


