    -- Add created_at to order_items for analytics date filtering
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at timestamptz default now();

    -- Index for date-range queries
    CREATE INDEX IF NOT EXISTS order_items_created_at_idx ON public.order_items (created_at);
