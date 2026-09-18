-- Migration: allow deleting products that are referenced by historical orders.
--
-- Hasta ahora `order_items.product_id` era NOT NULL con FK sin acción de borrado,
-- por lo que cualquier intento de borrar un producto referenciado por una orden
-- terminaba en `foreign key violation`.
--
-- order_items ya guarda los datos del producto en columnas denormalizadas
-- (`title`, `slug`, `price`, `size`), así que podemos romper la FK al borrar
-- el producto sin perder la información histórica de la orden.
--
-- Cambios:
--   1. order_items.product_id pasa a ser nullable.
--   2. La FK se recrea con ON DELETE SET NULL.

ALTER TABLE public.order_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE SET NULL;
