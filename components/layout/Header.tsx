"use client";
import Link from 'next/link';
import { StoreLogo } from '@/components/layout/StoreLogo';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, Search as SearchIcon, X, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { cn } from '@/lib/utils';
import { BannerTicker } from './BannerTicker';
import { STREETWEAR_SUBCATEGORIES, Brand } from '@/types/db';

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCart = useUIStore((s) => s.openCart);
  const cartItems = useCartStore((s) => s.items);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isInAdmin = pathname.startsWith('/admin');

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();
      if (!authUser) {
        if (!cancelled) {
          setIsAdmin(false);
          setUser(null);
        }
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      if (!cancelled) {
        setIsAdmin(profile?.role === 'admin');
        setUser(authUser);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargamos las marcas activas para el megamenú de "Marcas"
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

  // Cerramos el dropdown al navegar
  useEffect(() => {
    setBrandsOpen(false);
  }, [pathname]);

  if (isInAdmin) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-gray-200 shadow-sm pt-[env(safe-area-inset-top)]">
      <BannerTicker />

      {/* Fila única: nav (izq) · logo (centro real) · utilidades (der) */}
      <div className="relative h-14 md:h-16 px-2 md:px-6 flex items-center justify-between max-w-[1600px] mx-auto">

        {/* Izquierda - menú móvil + navegación */}
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 xl:hidden transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="hidden xl:flex items-center gap-0">
            <Link
              href="/nuevos-ingresos"
              className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight whitespace-nowrap"
            >
              New Arrivals
            </Link>

            {/* ── Marcas (megamenú: hover o click) ── */}
            {brands.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setBrandsOpen(true)}
                onMouseLeave={() => setBrandsOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setBrandsOpen((v) => !v)}
                  aria-expanded={brandsOpen}
                  aria-haspopup="true"
                  className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1 uppercase tracking-tight"
                >
                  Marcas
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 text-gray-400 transition-transform duration-200',
                      brandsOpen && 'rotate-180 text-gray-900'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'absolute left-0 top-full pt-2 z-50 transition-all duration-200',
                    brandsOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                  )}
                >
                  <div className="w-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-2 gap-0.5 p-2">
                      {brands.map((brand) => (
                        <Link
                          key={brand.id}
                          href={`/productos?brand=${brand.slug}`}
                          className="rounded-lg px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-tight"
                        >
                          {brand.name}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-200">
                      <Link
                        href="/productos"
                        className="flex items-center justify-center gap-2 px-3 py-3 text-sm font-black text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-tight"
                      >
                        Ver todas las marcas
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/productos?sneakers"
              className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Sneakers
            </Link>

            <div className="relative group">
              <Link
                href="/productos?streetwear"
                className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1 uppercase tracking-tight"
              >
                Streetwear
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </Link>

              <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 space-y-0.5">
                    {STREETWEAR_SUBCATEGORIES.map((sub) => (
                      <Link
                        key={sub.value}
                        href={`/productos?streetwear&sub=${sub.value}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                      >
                        <span className="text-lg">{sub.icon}</span>
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-200">
                    <Link
                      href="/productos?streetwear"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-black text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-tight"
                    >
                      Ver todo en Streetwear
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/ofertas"
              className="rounded-lg px-2 2xl:px-2.5 py-2 text-[11px] 2xl:text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm hover:shadow-md uppercase tracking-tight"
            >
              Ofertas
            </Link>
            <Link
              href="/encargos"
              className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Encargos
            </Link>
            <Link
              href="/nosotros"
              className="rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Nosotros
            </Link>
          </nav>
        </div>

        {/* Centro - Logo. Desde 1536px va absoluto, así queda en el centro
            exacto del header y no corrido a la derecha (con mx-auto se centra
            en el sobrante, y el menú de la izquierda es más ancho que los
            íconos de la derecha). Debajo de ese ancho el menú ocupa más de la
            mitad de la barra: ahí el logo sigue en el flujo con mx-auto, que
            lo deja lo más al centro posible sin pisar las categorías.
            pointer-events-none deja clickeable lo que queda debajo. */}
        <div className="mx-auto min-[1400px]:mx-0 min-[1400px]:pointer-events-none min-[1400px]:absolute min-[1400px]:inset-0 min-[1400px]:flex min-[1400px]:items-center min-[1400px]:justify-center">
          <Link
            href="/"
            className="pointer-events-auto flex items-center shrink-0 px-2"
            aria-label="Inicio"
          >
            <StoreLogo priority className="h-12 md:h-14 w-auto" />
          </Link>
        </div>

        {/* Derecha - Buscar y acciones */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <form
            className="relative hidden lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              if (!q) return router.push('/productos');
              router.push(`/productos?q=${encodeURIComponent(q)}`);
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o talle…"
              className="w-40 xl:w-52 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-400 font-bold transition-all focus:w-72 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </form>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Buscar"
          >
            {showSearch ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:flex rounded-lg px-1.5 2xl:px-2 py-2 text-[11px] 2xl:text-xs font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Admin
            </Link>
          )}

          {!isAdmin && !user && (
            <Link
              href="/login"
              className="hidden sm:flex rounded-xl px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 transition-colors font-bold"
            >
              Admin
            </Link>
          )}

          <button
            className="relative inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Abrir carrito"
            onClick={openCart}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-black text-white text-[10px] font-black border-2 border-white animate-badge-pop"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="lg:hidden px-4 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fadeIn bg-white border-t border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              setShowSearch(false);
              if (!q) return router.push('/productos');
              router.push(`/productos?q=${encodeURIComponent(q)}`);
            }}
          >
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscá por nombre, marca o talle (ej: 42)"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pl-10 text-sm text-gray-900 placeholder-gray-400 font-bold focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                autoFocus
              />
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
