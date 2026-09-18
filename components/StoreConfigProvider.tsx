"use client";
import { createContext, useContext, ReactNode } from 'react';
import { StoreConfig, DEFAULT_STORE_CONFIG } from '@/lib/storeConfig';

const StoreConfigContext = createContext<StoreConfig>(DEFAULT_STORE_CONFIG);

/**
 * Configuración de la tienda (nombre, logo, contacto, redes, cobros).
 * La resuelve el layout en el servidor, así que acá siempre llega completa
 * y no hace falta esperar ninguna consulta.
 */
export function useStoreConfig() {
  return useContext(StoreConfigContext);
}

export function StoreConfigProvider({ config, children }: { config: StoreConfig; children: ReactNode }) {
  return <StoreConfigContext.Provider value={config}>{children}</StoreConfigContext.Provider>;
}
