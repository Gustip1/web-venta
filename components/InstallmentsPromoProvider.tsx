"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { InstallmentsPromoContent, DEFAULT_INSTALLMENTS_PROMO_CONTENT } from '@/lib/homeContent';

const InstallmentsPromoContext = createContext<InstallmentsPromoContent>(DEFAULT_INSTALLMENTS_PROMO_CONTENT);

/**
 * Configuración de cuotas cargada desde /admin/ajustes:
 *   active    → promo "sin recargo"
 *   enabled   → se ofrecen cuotas (modo 'on')
 *   comingSoon→ se anuncian como próximamente (modo 'soon')
 * En modo 'off' los dos últimos son false y no se muestran en ningún lado.
 */
export function useInstallmentsPromo() {
  const promo = useContext(InstallmentsPromoContext);
  return {
    ...promo,
    enabled: promo.mode === 'on',
    comingSoon: promo.mode === 'soon',
    // La promo sin recargo sólo tiene sentido con las cuotas ofreciéndose.
    active: promo.active && promo.mode === 'on',
  };
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
