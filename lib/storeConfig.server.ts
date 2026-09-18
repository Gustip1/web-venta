import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { STORE_CONFIG_KEY, mergeStoreConfig, DEFAULT_STORE_CONFIG, StoreConfig } from '@/lib/storeConfig';

/**
 * Lee la configuración de la tienda en el servidor, para que el layout pinte
 * los colores y el nombre correctos en el primer render (sin parpadeo).
 * Si Supabase todavía no está configurado, devuelve los valores por defecto:
 * así el proyecto arranca aunque falten las claves.
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_STORE_CONFIG;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', STORE_CONFIG_KEY)
      .maybeSingle();
    return mergeStoreConfig(data?.value);
  } catch {
    return DEFAULT_STORE_CONFIG;
  }
}
