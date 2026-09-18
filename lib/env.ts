/**
 * Validación centralizada de variables de entorno
 * Falla en build time si faltan variables críticas
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase (Públicas - Cliente)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, 'NEXT_PUBLIC_SUPABASE_URL es requerida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
  
  // Supabase (Privadas - Servidor)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY es requerida (solo servidor)'),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validar solo en servidor (no en cliente)
function validateEnv() {
  const isServer = typeof window === 'undefined';
  
  if (!isServer) {
    // En el cliente, solo validar variables públicas
    const clientEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV || 'development',
      SUPABASE_SERVICE_ROLE_KEY: 'client-side-skip-validation', // No se usa en cliente
    };
    return envSchema.parse(clientEnv);
  }

  // En el servidor, validar todas las variables
  const serverEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  try {
    return envSchema.parse(serverEnv);
  } catch (error) {
    console.error('❌ Variables de entorno inválidas:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Variables de entorno no configuradas correctamente');
  }
}

export const env = validateEnv();

// Type-safe access
export type Env = z.infer<typeof envSchema>;

