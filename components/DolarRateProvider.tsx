"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface DolarRateContextType {
  rate: number;
  isLoading: boolean;
}

const DEFAULT_RATE = 1000;

const DolarRateContext = createContext<DolarRateContextType>({
  rate: DEFAULT_RATE,
  isLoading: false,
});

/** Valor del dólar que carga el admin en /admin/precios (settings.usd_ars_rate). */
export function useDolarRate() {
  return useContext(DolarRateContext);
}

// El layout raíz no se vuelve a montar al navegar, así que sin refresco alguien
// con la pestaña abierta se quedaría con el valor viejo después de que el admin
// lo cambia. Mismo criterio que InstallmentsPromoProvider.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function DolarRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number>(DEFAULT_RATE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRate = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'usd_ars_rate')
      .maybeSingle();

    const value = Number(data?.value);
    if (Number.isFinite(value) && value > 0) setRate(value);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRate();

    const interval = setInterval(fetchRate, REFRESH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchRate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchRate]);

  return (
    <DolarRateContext.Provider value={{ rate, isLoading }}>
      {children}
    </DolarRateContext.Provider>
  );
}
