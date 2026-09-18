"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface DolarRateContextType {
  rate: number;
  isLoading: boolean;
  lastUpdate: string | null;
}

const DolarRateContext = createContext<DolarRateContextType>({
  rate: 1000,
  isLoading: false,
  lastUpdate: null
});

export function useDolarRate() {
  return useContext(DolarRateContext);
}

export function DolarRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      setIsLoading(true);
      try {
        console.log('[DOLLAR API] Fetching rate from internal API...');
        
        // Usar nuestro API interno que tiene fallbacks
        const res = await fetch('/api/dollar-rate', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Añadir timeout
          signal: AbortSignal.timeout(10000) // 10 segundos timeout
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('[DOLLAR API] Response:', data);
        
        if (data?.rate && typeof data.rate === 'number') {
          setRate(Number(data.rate));
          setLastUpdate(new Date().toLocaleTimeString('es-AR'));
          console.log('[DOLLAR API] Rate updated:', data.rate, 'from', data.source);
        } else {
          console.warn('[DOLLAR API] Invalid response format:', data);
        }
      } catch (error) {
        console.error('[DOLLAR API] Error fetching rate:', error);
        // Mantener el último valor conocido en caso de error
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch inmediatamente
    fetchRate();
    
    // Luego cada 30 minutos
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <DolarRateContext.Provider value={{ rate, isLoading, lastUpdate }}>
      {children}
    </DolarRateContext.Provider>
  );
}

