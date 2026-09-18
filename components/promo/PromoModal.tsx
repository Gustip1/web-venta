"use client";
import { useEffect, useState } from 'react';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';
import { PROMO_TEXT } from '@/lib/promo';

export function PromoModal() {
  const { active } = useInstallmentsPromo();
  const { open: noticeOpen } = useAccountNotice();
  const [open, setOpen] = useState(false);

  // Aparece SIEMPRE que entran al sitio (refresh / pestaña nueva /
  // visita nueva) mientras la promo esté activa desde /admin/ajustes.
  // Si el aviso de cuenta está en pantalla espera su turno: encimados no se
  // lee ninguno de los dos.
  useEffect(() => {
    if (active && !noticeOpen) setOpen(true);
  }, [active, noticeOpen]);

  const dismiss = () => setOpen(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative max-w-md w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-600/30 p-6 sm:p-8 text-center animate-promo-glow">
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
            🔥🔥 Promo por tiempo limitado 🔥🔥
          </span>
        </div>

        <h2
          id="promo-title"
          className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3"
        >
          3 cuotas <span className="text-red-500">sin interés</span>
        </h2>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
          {PROMO_TEXT}
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="w-full sm:w-auto sm:min-w-[180px] px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-sm transition-colors active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          autoFocus
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
