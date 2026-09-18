"use client";
import Link from 'next/link';
import Image from 'next/image';
import { StoreLogo } from '@/components/layout/StoreLogo';
import { useStoreConfig } from '@/components/StoreConfigProvider';
import { socialHandle } from '@/lib/storeConfig';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronDown, Instagram, Sparkles, ShieldCheck } from 'lucide-react';
import { STREETWEAR_SUBCATEGORIES, Brand } from '@/types/db';
import { createBrowserClient } from '@/lib/supabase/client';

export function Sidebar() {
  const config = useStoreConfig();
  const igHandle = socialHandle(config.social.instagram);
  const ttHandle = socialHandle(config.social.tiktok);
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);
  const [streetwearOpen, setStreetwearOpen] = useState(false);
  const [marcasOpen, setMarcasOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');
      if (!cancelled && data) setBrands(data as Brand[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // El link "Admin" del header desktop está oculto en mobile (hidden sm:flex);
  // este es el único acceso al panel de administración en la versión móvil.
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setHasSession(false);
        return;
      }
      if (!cancelled) setHasSession(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!cancelled) setIsAdmin(profile?.role === 'admin');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ESC to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 xl:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white border-r border-gray-200 shadow-2xl transition-transform duration-300 ease-out xl:hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <Link href="/" onClick={close} className="flex items-center gap-3">
            <StoreLogo className="h-12 w-auto" />
            <div>
              <p className="font-black text-gray-900 uppercase tracking-tight">{config.name}</p>
              <p className="text-xs text-gray-500 font-bold">{config.tagline}</p>
            </div>
          </Link>
          <button
            onClick={close}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* flex-1 + min-h-0: el nav ocupa exactamente el espacio entre el
            encabezado y el bloque "Seguinos", así el scroll siempre llega
            hasta el último ítem (Admin) sin quedar tapado. overscroll-contain
            evita que al llegar al fondo siga scrolleando la página de atrás. */}
        <nav className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 px-2">
            Categorías
          </p>
          <div className="space-y-1">
            <Link
              href="/nuevos-ingresos"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                <Sparkles className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-gray-900">New Arrivals</p>
                <p className="text-xs font-bold text-gray-500">Lo último que llegó</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {brands.length > 0 && (
              <div>
                <button
                  onClick={() => setMarcasOpen(!marcasOpen)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                    🏷️
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black uppercase tracking-tight text-gray-900">Marcas</p>
                    <p className="text-xs font-bold text-gray-500">Comprá por marca</p>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-gray-400 transition-transform duration-200",
                    marcasOpen && "rotate-180"
                  )} />
                </button>

                <div className={cn(
                  "overflow-hidden transition-all duration-200 ease-out",
                  marcasOpen ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="ml-6 pl-4 border-l border-gray-200 grid grid-cols-2 gap-0.5 py-1">
                    {brands.map((brand) => (
                      <Link
                        key={brand.id}
                        href={`/productos?brand=${brand.slug}`}
                        onClick={close}
                        className="rounded-lg px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-tight"
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/productos?sneakers"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                👟
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-gray-900">Sneakers</p>
                <p className="text-xs font-bold text-gray-500">Calzado premium</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <div>
              <button
                onClick={() => setStreetwearOpen(!streetwearOpen)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                  👕
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black uppercase tracking-tight text-gray-900">Streetwear</p>
                  <p className="text-xs font-bold text-gray-500">Ropa urbana</p>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-gray-400 transition-transform duration-200",
                  streetwearOpen && "rotate-180"
                )} />
              </button>

              <div className={cn(
                "overflow-hidden transition-all duration-200 ease-out",
                streetwearOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="ml-6 pl-4 border-l border-gray-200 space-y-0.5 py-1">
                  {STREETWEAR_SUBCATEGORIES.map((sub) => (
                    <Link
                      key={sub.value}
                      href={`/productos?streetwear&sub=${sub.value}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                    >
                      <span className="text-lg">{sub.icon}</span>
                      <span>{sub.label}</span>
                    </Link>
                  ))}
                  <Link
                    href="/productos?streetwear"
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-all mt-1 border-t border-gray-200 pt-2.5"
                  >
                    <span className="text-lg">🔥</span>
                    <span>Ver todo en Streetwear</span>
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/ofertas"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black bg-red-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-white/20">
                🔥
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-white">Ofertas</p>
                <p className="text-xs font-bold text-white/80">Precios especiales</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </Link>

            <Link
              href="/encargos"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                📦
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-gray-900">Encargos</p>
                <p className="text-xs font-bold text-gray-500">Pedidos especiales</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              href="/nosotros"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                ✨
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-gray-900">Nosotros</p>
                <p className="text-xs font-bold text-gray-500">Quiénes somos + redes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900 border-t border-gray-200 mt-2 pt-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                  <ShieldCheck className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-black uppercase tracking-tight text-gray-900">Admin</p>
                  <p className="text-xs font-bold text-gray-500">Panel de administración</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            )}

            {/* Si la sesión se venció o nunca inició (ej. tras borrar caché/cookies
                del navegador), sin este link no había forma de volver a entrar al
                admin desde el celular — el header desktop sí tiene este fallback. */}
            {!isAdmin && !hasSession && (
              <Link
                href="/login"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-gray-100 text-gray-900 border-t border-gray-200 mt-2 pt-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                  <ShieldCheck className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-black uppercase tracking-tight text-gray-900">Admin</p>
                  <p className="text-xs font-bold text-gray-500">Iniciar sesión</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            )}
          </div>
        </nav>

        <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 bg-white space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Seguinos</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={config.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl p-2.5 bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/15 to-[#fcb045]/15 border border-gray-200 hover:border-gray-400 active:scale-[0.98] transition-all"
              aria-label={`Instagram ${igHandle ?? ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none">IG</p>
                <p className="text-xs font-black text-gray-900 truncate leading-tight mt-0.5">{igHandle}</p>
              </div>
            </a>
            <a
              href={config.social.tiktok}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl p-2.5 bg-gray-50 border border-gray-200 hover:border-gray-400 active:scale-[0.98] transition-all"
              aria-label={`TikTok ${ttHandle ?? ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-700" aria-hidden="true">
                  <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none">TikTok</p>
                <p className="text-xs font-black text-gray-900 truncate leading-tight mt-0.5">{ttHandle}</p>
              </div>
            </a>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black border border-gray-200">
              ✓ Originales
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black border border-gray-200">
              📦 Envío nacional
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
