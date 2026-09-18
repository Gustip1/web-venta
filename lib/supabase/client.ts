import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Usa cookies para la sesión, para que el servidor (SSR) reconozca al usuario
  return createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
}


