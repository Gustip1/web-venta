import Link from 'next/link';
import { Instagram, MapPin, MessageCircle, ArrowUpRight, Shield, Truck, CreditCard } from 'lucide-react';
import { StoreLogo } from '@/components/layout/StoreLogo';
import { getStoreConfig } from '@/lib/storeConfig.server';
import { whatsappUrl, socialHandle } from '@/lib/storeConfig';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
    </svg>
  );
}

export async function Footer() {
  const year = new Date().getFullYear();
  const config = await getStoreConfig();

  const INSTAGRAM_URL = config.social.instagram;
  const TIKTOK_URL = config.social.tiktok;
  const WHATSAPP_URL = whatsappUrl(config) ?? '';
  const igHandle = socialHandle(INSTAGRAM_URL);
  const ttHandle = socialHandle(TIKTOK_URL);

  return (
    <footer className="relative mt-10 md:mt-16 border-t border-gray-200 bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-5 md:px-10 pt-10 md:pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-10">
        {/* Top: CTA row */}
        <div className="grid gap-6 md:gap-8 md:grid-cols-[1.1fr_1fr] items-start">
          <div>
            <div className="flex items-center gap-3">
              <StoreLogo priority className="h-10 w-auto rounded-md" />
              <div>
                <p className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none">{config.name}</p>
                <p className="text-[11px] md:text-xs text-gray-500 font-bold mt-1">
                  {[config.tagline, config.contact.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm md:text-[15px] text-gray-600 font-medium leading-relaxed">
              {config.about}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 p-4 md:p-5 bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/8 to-[#fcb045]/10 hover:border-gray-400 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Instagram className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="mt-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Instagram</p>
              <p className="text-sm md:text-base font-black text-gray-900 leading-tight">{igHandle}</p>
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 p-4 md:p-5 bg-white hover:border-gray-400 transition-all active:scale-[0.98]"
            >
              <div className="relative flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <TikTokIcon className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="relative mt-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">TikTok</p>
              <p className="relative text-sm md:text-base font-black text-gray-900 leading-tight">{ttHandle}</p>
            </a>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 md:mt-14 grid grid-cols-3 gap-2.5 md:gap-4">
          {[
            { icon: Shield, title: '100% Originales', sub: 'Autenticidad garantizada' },
            { icon: Truck, title: 'Envíos nacionales', sub: 'Seguimiento incluido' },
            { icon: CreditCard, title: '3 cuotas s/interés', sub: 'Tarjetas bancarias' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 md:p-4">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-900" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] md:text-sm font-black text-gray-900 leading-tight truncate">{title}</p>
                <p className="hidden md:block text-[11px] text-gray-500 font-bold mt-0.5 truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Links grid */}
        <div className="mt-10 md:mt-14 grid gap-8 grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Tienda</p>
            <ul className="space-y-2.5 text-sm font-bold text-gray-600">
              <li><Link href="/productos?sneakers" className="hover:text-gray-900 transition-colors">Sneakers</Link></li>
              <li><Link href="/productos?streetwear" className="hover:text-gray-900 transition-colors">Streetwear</Link></li>
              <li><Link href="/ofertas" className="hover:text-gray-900 transition-colors">Ofertas</Link></li>
              <li><Link href="/nuevos-ingresos" className="hover:text-gray-900 transition-colors">Nuevos ingresos</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Servicios</p>
            <ul className="space-y-2.5 text-sm font-bold text-gray-600">
              <li><Link href="/encargos" className="hover:text-gray-900 transition-colors">Encargos</Link></li>
              <li><Link href="/nosotros" className="hover:text-gray-900 transition-colors">Nosotros</Link></li>
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors">
                  WhatsApp <MessageCircle className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Seguinos</p>
            <ul className="space-y-2.5 text-sm font-bold text-gray-600">
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gray-900 transition-colors">
                  <Instagram className="w-3.5 h-3.5" /> {igHandle}
                </a>
              </li>
              <li>
                <a href={TIKTOK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gray-900 transition-colors">
                  <TikTokIcon className="w-3.5 h-3.5" /> {ttHandle}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Ubicación</p>
            <div className="flex items-start gap-2 text-sm font-bold text-gray-600">
              <MapPin className="w-4 h-4 text-gray-900 shrink-0 mt-0.5" />
              <span>
                {config.contact.city || 'Cargá tu ciudad en Ajustes'}
                {config.contact.address && (
                  <><br /><span className="text-gray-400 font-medium text-xs">{config.contact.address}</span></>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 md:mt-14 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] md:text-xs font-bold text-gray-400">
          <p>© {year} {config.name} · Todos los derechos reservados.</p>
          <p>
            Todas las ventas son <span className="text-gray-600 font-black">Final Sale</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
