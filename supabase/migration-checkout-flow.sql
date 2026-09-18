-- Migration: Checkout flow improvements
-- Adds payment_method enum, document field, and stock decrement function

-- Add document field to orders (DNI/CUIT)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS document text;

-- Update payment_method to support new options
-- payment_method values: 'cash' | 'crypto_transfer' | 'installments_3'
-- (keeping as text for flexibility)

-- Function: decrement variant stock atomically when order is confirmed
-- Called from the API route when processing a purchase
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id uuid,
  p_quantity int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock int;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT stock INTO current_stock
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_stock < p_quantity THEN
    RETURN false; -- not enough stock
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_quantity
  WHERE id = p_variant_id;

  RETURN true;
END;
$$;

-- Function: process order - decrement stock for all items and update order status
CREATE OR REPLACE FUNCTION public.process_order_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
  variant_id uuid;
  success boolean;
BEGIN
  -- Iterate over order items
  FOR item IN
    SELECT oi.product_id, oi.size, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Find the variant
    SELECT pv.id INTO variant_id
    FROM public.product_variants pv
    WHERE pv.product_id = item.product_id
      AND pv.size = item.size;

    IF variant_id IS NULL THEN
      RAISE EXCEPTION 'Variant not found for product % size %', item.product_id, item.size;
    END IF;

    -- Decrement stock
    success := public.decrement_variant_stock(variant_id, item.quantity);
    IF NOT success THEN
      RAISE EXCEPTION 'Insufficient stock for product % size %', item.product_id, item.size;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Grant execute to authenticated and anon (checkout without login)
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_order_stock(uuid) TO authenticated, anon;
