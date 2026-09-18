"use client";
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Oculta en /admin los elementos que son solo de la tienda. El layout raíz es
 * un server component y no puede leer la ruta, así que el footer, el carrito y
 * los popups promocionales se estaban renderizando también dentro del panel:
 * aparecía el footer completo de la tienda debajo de las métricas y el modal de
 * "3 cuotas" tapaba el panel.
 */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}
