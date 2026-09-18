"use client";
import { ArrowUpRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { PromoBannerContent } from '@/lib/homeContent';

/**
 * Banner promocional genérico configurable desde /admin/portada (settings.homepage_banner).
 * Reemplaza el banner de El Cuartito que estaba hardcodeado: ahora cualquier campaña futura
 * se activa editando texto, sin tocar código.
 */
export function PromoBanner({ content }: { content: PromoBannerContent }) {
  if (!content.enabled || !content.title.trim() || !content.ctaHref.trim()) return null;

  return (
    <section className="bg-white py-10 md:py-16">
      <div className="max-w-[1400px] mx-auto px-4">
        <a
          href={content.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('homepage_banner_click', 'promo', { href: content.ctaHref })}
          aria-label={content.title}
          className="group relative block overflow-hidden rounded-3xl bg-[#0a0a0a] border border-white/10 transition-all duration-500 hover:border-white/30"
        >
          <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-8 md:gap-14 px-6 py-10 md:px-14 md:py-14">
            <div className="text-center md:text-left">
              {content.eyebrow && (
                <p className="inline-flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white/70" />
                  </span>
                  {content.eyebrow}
                </p>
              )}

              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-[0.95] tracking-tight">
                {content.title}
              </h2>

              {content.subtitle && (
                <p className="mt-4 max-w-md mx-auto md:mx-0 text-sm md:text-base text-white/60 font-medium leading-relaxed">
                  {content.subtitle}
                </p>
              )}

              {content.ctaLabel && (
                <div className="mt-7 flex justify-center md:justify-start">
                  <span className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-black text-sm font-black uppercase tracking-tight rounded-full transition-all duration-300 group-hover:scale-[1.03] group-active:scale-[0.98]">
                    {content.ctaLabel}
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              )}
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
