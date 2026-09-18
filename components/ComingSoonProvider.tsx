"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

/** id del producto → texto de cuándo llega ('' si no se cargó fecha) */
type ComingSoonMap = Map<string, string>;

const ComingSoonContext = createContext<ComingSoonMap>(new Map());

/**
 * Estado de "próximo ingreso" de un producto: si está en camino y, si el admin
 * la cargó, la fecha estimada de llegada ("2 semanas", "15/03", etc.).
 */
export function useComingSoon(productId: string | undefined) {
  const map = useContext(ComingSoonContext);
  if (!productId || !map.has(productId)) return { isComingSoon: false, eta: '' };
  return { isComingSoon: true, eta: map.get(productId) || '' };
}

// Mismo criterio que InstallmentsPromoProvider: el layout raíz no se remonta
// al navegar, así que sin un refresco periódico alguien que ya tenía el sitio
// abierto se quedaría con la lista vieja hasta recargar a mano.
const REFRESH_INTERVAL_MS = 60_000;

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<{ ids: string[]; eta: Record<string, string> }>({ ids: [], eta: {} });

  const fetchIds = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'coming_soon')
      .maybeSingle();
    const value = data?.value as { ids?: unknown; eta?: unknown } | null;
    setRaw({
      ids: Array.isArray(value?.ids) ? value!.ids.filter((x): x is string => typeof x === 'string') : [],
      eta: value?.eta && typeof value.eta === 'object' ? (value.eta as Record<string, string>) : {},
    });
  }, []);

  useEffect(() => {
    fetchIds();
    const interval = setInterval(fetchIds, REFRESH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchIds();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchIds]);

  const value = useMemo(
    () => new Map(raw.ids.map((id) => [id, typeof raw.eta[id] === 'string' ? raw.eta[id] : ''])),
    [raw]
  );

  return <ComingSoonContext.Provider value={value}>{children}</ComingSoonContext.Provider>;
}
