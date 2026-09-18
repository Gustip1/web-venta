"use client";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/track';

import { useStoreConfig } from '@/components/StoreConfigProvider';
import { whatsappUrl } from '@/lib/storeConfig';

type Currency = 'ARS' | 'USD';

/**
 * "Hacer una oferta" — el cliente propone un precio (en pesos o dólares, a su
 * elección) y se abre WhatsApp con el mensaje armado para negociar. No crea
 * ninguna orden ni pasa por el backend, mismo criterio que el flujo de
 * 3 cuotas del checkout.
 */
export function MakeOffer({ productTitle, productSlug }: { productTitle: string; productSlug: string }) {
  const config = useStoreConfig();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const value = amount.trim();
    if (!value) return;

    trackEvent('offer_requested', 'ecommerce', { slug: productSlug, amount: value, currency });

    const productUrl = typeof window !== 'undefined' ? window.location.href : '';
    const currencyLabel = currency === 'USD' ? 'dólares (USD)' : 'pesos (ARS)';
    const message =
      `¡Hola! Quiero hacer una oferta por este producto:\n\n` +
      `👟 *${productTitle}*\n${productUrl}\n\n` +
      `💰 *Mi oferta:* ${currency === 'USD' ? 'US$' : '$'}${value} — en *${currencyLabel}*\n\n` +
      `¿Podemos negociar?`;

    const url = whatsappUrl(config, message);
    if (url) window.open(url, '_blank');
    setOpen(false);
    setAmount('');
  };

  return (
    <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 md:p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl bg-red-600 text-white font-black text-sm md:text-base uppercase tracking-tight hover:bg-red-700 active:scale-[0.99] transition-all"
        >
          🔥 Hacer una oferta
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">¿Cuánto ofrecés?</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrency('ARS')}
              className={cn(
                'flex-1 py-2.5 rounded-lg border-2 font-black text-sm transition-colors',
                currency === 'ARS' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700',
              )}
            >
              Pesos (ARS)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={cn(
                'flex-1 py-2.5 rounded-lg border-2 font-black text-sm transition-colors',
                currency === 'USD' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700',
              )}
            >
              Dólares (USD)
            </button>
          </div>

          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={currency === 'ARS' ? 'Ej: 800000' : 'Ej: 500'}
            autoFocus
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base font-black text-gray-900 focus:outline-none focus:border-red-600 transition-colors"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-black text-sm uppercase tracking-tight hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!amount.trim()}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm uppercase tracking-tight hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Enviar oferta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
