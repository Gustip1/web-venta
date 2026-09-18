"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { InstallmentsPromoContent, DEFAULT_INSTALLMENTS_PROMO_CONTENT } from '@/lib/homeContent';

const InstallmentsPromoContext = createContext<InstallmentsPromoContent>(DEFAULT_INSTALLMENTS_PROMO_CONTENT);

/** true cuando el admin activó "3 cuotas sin interés sin recargo" desde /admin/ajustes. */
export function useInstallmentsPromo() {
  return useContext(InstallmentsPromoContext);
}

// Este valor se lee una vez al montar el layout raíz, que en Next.js App
// Router NO se remonta al navegar entre páginas — sin un refresco periódico,
// alguien que ya tenía el sitio abierto cuando el admin activó/desactivó la
// promo se queda con el valor viejo hasta que recarga a mano.
const REFRESH_INTERVAL_MS = 60_000;

export function InstallmentsPromoProvider({ children }: { children: ReactNode }) {
  const [promo, setPromo] = useState<InstallmentsPromoContent>(DEFAULT_INSTALLMENTS_PROMO_CONTENT);

  const fetchPromo = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'installments_promo')
      .maybeSingle();
    const value = data?.value as Partial<InstallmentsPromoContent> | undefined;
    if (value) setPromo({ ...DEFAULT_INSTALLMENTS_PROMO_CONTENT, ...value });
  }, []);

  useEffect(() => {
    fetchPromo();

    const interval = setInterval(fetchPromo, REFRESH_INTERVAL_MS);

    // Al volver a la pestaña (usuario que la dejó abierta y vuelve) se
    // refresca al toque, sin esperar el intervalo.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchPromo();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchPromo]);

  return (
    <InstallmentsPromoContext.Provider value={promo}>
      {children}
    </InstallmentsPromoContext.Provider>
  );
}
