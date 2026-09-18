-- Migración: Agregar columna is_new a productos
-- Ejecutar en Supabase SQL Editor

-- Agregar columna is_new si no existe
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Crear índice para mejorar performance en queries de nuevos ingresos
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products(is_new) WHERE is_new = true;

-- Crear índice compuesto para optimizar queries combinadas
CREATE INDEX IF NOT EXISTS idx_products_active_is_new ON public.products(active, is_new) WHERE active = true;

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_new';
