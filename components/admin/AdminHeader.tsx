"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, LogOut, Search, Plus } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useState } from 'react';

export function AdminHeader() {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const [showSearch, setShowSearch] = useState(false);
  
  const getPageInfo = () => {
    if (pathname === '/admin') return { title: 'Dashboard', subtitle: 'Resumen general' };
    if (pathname.includes('/admin/productos/nuevo')) return { title: 'Nuevo Producto', subtitle: 'Crear producto' };
    if (pathname.includes('/admin/productos/')) return { title: 'Editar Producto', subtitle: 'Modificar producto' };
    if (pathname.startsWith('/admin/productos')) return { title: 'Productos', subtitle: 'Gestiona tu catálogo' };
    if (pathname.includes('/admin/pedidos/')) return { title: 'Detalle Pedido', subtitle: 'Ver pedido' };
    if (pathname.startsWith('/admin/pedidos')) return { title: 'Pedidos', subtitle: 'Gestiona tus ventas' };
    if (pathname.startsWith('/admin/stock')) return { title: 'Stock', subtitle: 'Control de inventario' };
    if (pathname.startsWith('/admin/precios')) return { title: 'Precios', subtitle: 'Ajusta tus precios' };
    if (pathname.startsWith('/admin/destacados')) return { title: 'Destacados', subtitle: 'Productos destacados' };
    if (pathname.startsWith('/admin/ofertas')) return { title: 'Ofertas', subtitle: 'Productos en oferta' };
    if (pathname.startsWith('/admin/proximos')) return { title: 'Próximos ingresos', subtitle: 'Productos en camino al showroom' };
    if (pathname.startsWith('/admin/uploads')) return { title: 'Imágenes', subtitle: 'Galería de medios' };
    if (pathname.startsWith('/admin/clientes')) return { title: 'Clientes', subtitle: 'Base de clientes' };
    if (pathname.startsWith('/admin/ajustes')) return { title: 'Ajustes', subtitle: 'Configuración' };
    return { title: 'Admin', subtitle: 'Panel de administración' };
  };

  const { title, subtitle } = getPageInfo();

  const getQuickAction = () => {
    if (pathname.startsWith('/admin/productos') && !pathname.includes('/nuevo') && !pathname.includes('/[id]')) {
      return { href: '/admin/productos/nuevo', label: 'Nuevo producto', icon: Plus };
    }
    return null;
  };

  const quickAction = getQuickAction();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left - Page title */}
          <div className="min-w-0 flex-1 md:pl-0 pl-12">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{title}</h1>
            <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{subtitle}</p>
          </div>
          
          {/* Center - Search (desktop) */}
          <div className="hidden lg:block flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar productos, pedidos..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>
          
          {/* Right - Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search toggle (mobile) */}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="lg:hidden rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 transition-colors" 
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
            
            {/* Quick action */}
            {quickAction && (
              <Link
                href={quickAction.href}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <quickAction.icon className="h-4 w-4" />
                <span className="hidden md:inline">{quickAction.label}</span>
              </Link>
            )}
            
            {/* Notifications */}
            <button 
              className="relative rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 transition-colors" 
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* User menu */}
            <div className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              <button 
                className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 transition-colors" 
                aria-label="Configuración"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                className="rounded-xl p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile search bar */}
        {showSearch && (
          <div className="lg:hidden mt-3 animate-fadeIn">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar productos, pedidos..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
