"use client";
import { useEffect, useRef } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import { useAccountNotice } from '@/components/announcement/AccountNoticeProvider';

/**
 * Aviso emergente de la tienda. Es bloqueante a propósito: no cierra con
 * Escape ni tocando el fondo, sólo con el botón de aceptar. El contenido se
 * escribe desde /admin/ajustes → pestaña Aviso.
 */
export function AccountNoticeModal() {
  const { notice, open, accept } = useAccountNotice();
  const cardRef = useRef<HTMLDivElement>(null);

  // Mientras tapa la pantalla, el fondo no scrollea.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  // El foco arranca y se queda dentro del diálogo: con el fondo inerte, un Tab
  // que se escapa deja al teclado navegando una página que no puede ver. Se
  // enfoca la tarjeta y no el botón, así el lector de pantalla lee el aviso
  // completo y no aparece un anillo de foco encima del CTA al abrir.
  useEffect(() => {
    if (!open) return;

    cardRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !cardRef.current) return;

      const focusables = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && (activeEl === first || !cardRef.current.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="animate-notice-overlay fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="account-notice-title"
        aria-describedby="account-notice-message"
        className="notice-card animate-notice-card relative my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-5 shadow-2xl shadow-black/60 sm:p-8"
      >
        {/* Barrido de luz de entrada — decorativo, no interactivo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="animate-notice-sheen absolute -inset-y-16 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative min-h-0 overflow-y-auto">
          {notice.badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-300">
              <span className="animate-notice-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
              {notice.badge}
            </span>
          )}

          <h2
            id="account-notice-title"
            className="mt-3 text-xl font-black leading-tight text-white sm:mt-4 sm:text-3xl"
          >
            {notice.title}
          </h2>

          {/* whitespace-pre-line: respeta los saltos que escribió el dueño */}
          <p
            id="account-notice-message"
            className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-zinc-300 sm:mt-3 sm:text-base"
          >
            {notice.message}
          </p>

          {notice.aside && (
            <p className="mt-2.5 border-l-2 border-amber-400/40 pl-3 text-[13px] italic leading-relaxed text-zinc-400 sm:mt-3 sm:text-sm">
              {notice.aside}
            </p>
          )}
        </div>

        {/* Pie fijo: en pantallas bajas el cuerpo scrollea, pero el botón para
            aceptar tiene que estar siempre a la vista. */}
        <div className="relative shrink-0 pt-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {notice.ctaLabel && notice.ctaUrl && (
              <a
                href={notice.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-[13px] font-black text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-1 sm:py-3 sm:text-sm"
              >
                <span className="truncate">{notice.ctaLabel}</span>
                <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
              </a>
            )}

            <button
              type="button"
              onClick={accept}
              className="inline-flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-black uppercase tracking-wider text-black outline-none transition-transform hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
            >
              {!notice.ctaLabel && <Megaphone aria-hidden className="h-4 w-4" />}
              {notice.accept}
            </button>
          </div>

          {notice.signature && (
            <p className="mt-4 text-center text-xs font-bold text-zinc-500 sm:mt-5">
              {notice.signature}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
