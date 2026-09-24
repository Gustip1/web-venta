"use client";
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useStoreConfig } from '@/components/StoreConfigProvider';
import { DolarWidget } from '@/components/DolarWidget';

const NORMAL_INSTALLMENT = '💳 3 cuotas sin interés (10% de recargo)';
const PROMO_INSTALLMENT = '🔥 PROMO: 3 cuotas sin interés SIN recargo';

export function BannerTicker() {
  const { active, enabled, comingSoon, soonLabel } = useInstallmentsPromo();
  // Los mensajes se editan en /admin/ajustes → Cinta de arriba.
  const { bannerMessages } = useStoreConfig();

  // Apagadas desde /admin/ajustes: la cinta ni las menciona.
  const installmentItem = enabled
    ? active
      ? PROMO_INSTALLMENT
      : NORMAL_INSTALLMENT
    : comingSoon
      ? `💳 ${soonLabel}`
      : null;

  const items = installmentItem ? [installmentItem, ...bannerMessages] : bannerMessages;

  return (
    <div className="w-full bg-gray-900 text-white border-b border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-2 md:px-4 max-w-[1600px] mx-auto">
        {/* Si el admin borró todos los mensajes queda sólo el dólar, sin cinta vacía. */}
        <div className="relative overflow-hidden flex-1 min-w-0" aria-label="Ofertas y mensajes importantes" role="region">
          <div className="animate-marquee motion-reduce:animate-none whitespace-nowrap py-1.5 md:py-2 will-change-transform">
            {[...items, ...items].map((item, idx) =>
              active && item === PROMO_INSTALLMENT ? (
                <span
                  key={idx}
                  className="mx-3 md:mx-6 inline-block text-[10px] md:text-sm font-black uppercase tracking-tight bg-red-600 text-white px-2.5 py-0.5 rounded-full animate-pulse"
                >
                  {item}
                </span>
              ) : (
                <span key={idx} className="mx-3 md:mx-6 inline-block text-[10px] md:text-sm font-bold">
                  {item}
                </span>
              )
            )}
          </div>
        </div>
        {/* Widget del dólar - OCULTO en móvil, VISIBLE en desktop */}
        <div className="hidden md:flex shrink-0 border-l border-white/30 pl-4 ml-4">
          <DolarWidget />
        </div>
      </div>
    </div>
  );
}
