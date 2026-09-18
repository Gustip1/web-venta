-- Migration: Restore stock when a cancelled order is deleted
-- Creates a function that increments stock back for all items in an order

CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
  variant_id uuid;
BEGIN
  FOR item IN
    SELECT oi.product_id, oi.size, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT pv.id INTO variant_id
    FROM public.product_variants pv
    WHERE pv.product_id = item.product_id
      AND pv.size = item.size;

    IF variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock = stock + item.quantity
      WHERE id = variant_id;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_order_stock(uuid) TO authenticated, anon;
