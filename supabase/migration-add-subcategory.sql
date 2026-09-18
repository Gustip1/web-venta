-- Migración: agregar subcategoría a productos (streetwear)
-- Subcategorías válidas: 'remeras', 'hoodies', 'pantalones', 'accesorios'

-- Agregar columna subcategory (nullable, solo aplica a streetwear)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory text;

-- Comentario para documentar
COMMENT ON COLUMN public.products.subcategory IS 'Subcategoría del producto. Para streetwear: remeras, hoodies, pantalones. NULL para sneakers.';

-- Índice para filtrar por subcategoría
CREATE INDEX IF NOT EXISTS products_subcategory_idx ON public.products (subcategory) WHERE subcategory IS NOT NULL;

-- Índice compuesto para category + subcategory
CREATE INDEX IF NOT EXISTS products_category_subcategory_idx ON public.products (category, subcategory) WHERE active = true;
