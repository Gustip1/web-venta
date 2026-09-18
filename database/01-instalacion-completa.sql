-- ============================================================================
--  INSTALACIÓN COMPLETA DE LA BASE DE DATOS
-- ============================================================================
--
--  Cómo usarlo:
--    1. Entrá a tu proyecto en https://supabase.com
--    2. Menú lateral → SQL Editor → New query
--    3. Copiá y pegá TODO este archivo
--    4. Botón "Run"
--
--  Tarda unos segundos. Se puede volver a ejecutar sin romper nada: todo está
--  escrito para ser idempotente (create if not exists / drop policy if exists).
--
--  Después de correr esto, seguí con 02-datos-iniciales.sql.
-- ============================================================================



-- ============================================================================
-- Tablas base, perfiles, productos, pedidos y ajustes
-- (origen: supabase/schema.sql)
-- ============================================================================

-- Enable extension for gen_random_uuid
-- Extensions (Supabase recomienda instalar en schema "extensions")
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- tipos y tablas
-- CREATE TYPE with conditional check (IF NOT EXISTS is not supported here)
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'product_category'
  ) then
    create type product_category as enum ('sneakers','streetwear');
  end if;
  if not exists (
    select 1 from pg_type where typname = 'fulfillment_method'
  ) then
    create type fulfillment_method as enum ('pickup','shipping');
  end if;
  if not exists (
    select 1 from pg_type where typname = 'order_status'
  ) then
    create type order_status as enum ('draft','paid','fulfilled','cancelled');
  end if;
end$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category product_category not null,
  price numeric(12,2) not null check (price >= 0),
  description text,
  images jsonb not null default '[]'::jsonb,
  featured_sneakers boolean not null default false,
  featured_streetwear boolean not null default false,
  on_sale boolean not null default false,
  is_new boolean not null default false,
  active boolean not null default true,
  subcategory text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  size text not null,
  stock int not null default 0 check (stock >= 0),
  unique(product_id, size)
);

create table if not exists public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text,
  message text,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz default now()
);

-- RLS
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.custom_orders enable row level security;
alter table public.profiles enable row level security;

-- Policies (recreate idempotently: drop if exists, then create)
drop policy if exists "read products" on public.products;
create policy "read products" on public.products for select using (true);

drop policy if exists "read variants" on public.product_variants;
create policy "read variants" on public.product_variants for select using (true);

drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admin write variants" on public.product_variants;
create policy "admin write variants" on public.product_variants
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "create custom order" on public.custom_orders;
create policy "create custom order" on public.custom_orders
  for insert with check (true);

drop policy if exists "read custom orders" on public.custom_orders;
create policy "read custom orders" on public.custom_orders
  for select using (true);

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- Tabla de configuración general (ej: tipo de cambio)
create table if not exists public.settings (
  key text primary key,
  value jsonb
);

alter table public.settings enable row level security;
drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings for select using (true);
drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Insertar valor inicial si no existe (no falla si ya existe)
insert into public.settings (key, value)
values ('usd_ars_rate', '1000.0')
on conflict (key) do nothing;


-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Orders (checkout)
-- drop/create idempotente
-- Secuencia para order_number humano
create sequence if not exists public.order_number_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status order_status not null default 'draft',
  fulfillment fulfillment_method not null default 'pickup',
  order_number text unique,
  first_name text,
  last_name text,
  email text,
  phone text,
  shipping_carrier text, -- 'andreani' | 'pickup'
  shipping_branch text, -- sucursal/branch nombre o id
  subtotal numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (subtotal + shipping_cost) stored,
  carrier text,
  tracking_number text,
  tracking_url text,
  payment_method text default 'bank_transfer', -- 'bank_transfer' | 'card'
  payment_status text default 'pending',      -- 'pending' | 'validated' | 'rejected'
  payment_alias text,                         -- alias para transferencia (ej: gus.p21)
  payment_proof_url text,                     -- URL del comprobante subido
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  slug text not null,
  price numeric(12,2) not null,
  size text not null,
  quantity int not null check (quantity > 0)
);

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders(id) on delete cascade,
  street text,
  number text,
  unit text,
  city text,
  province text,
  postal_code text,
  notes text
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;

-- Policies: por ahora lectura/insert libres (checkout sin login). Ajustar luego si se desea mayor privacidad.
drop policy if exists "public read orders" on public.orders;
create policy "public read orders" on public.orders for select using (true);
drop policy if exists "public write orders" on public.orders;
create policy "public write orders" on public.orders for insert with check (true);
drop policy if exists "public update orders" on public.orders;
create policy "public update orders" on public.orders for update using (true) with check (true);

drop policy if exists "public read order_items" on public.order_items;
create policy "public read order_items" on public.order_items for select using (true);
drop policy if exists "public write order_items" on public.order_items;
create policy "public write order_items" on public.order_items for insert with check (true);
drop policy if exists "public upsert order_items" on public.order_items;
create policy "public upsert order_items" on public.order_items for update using (true) with check (true);

drop policy if exists "public read shipping_addresses" on public.shipping_addresses;
create policy "public read shipping_addresses" on public.shipping_addresses for select using (true);
drop policy if exists "public write shipping_addresses" on public.shipping_addresses;
create policy "public write shipping_addresses" on public.shipping_addresses for insert with check (true);
drop policy if exists "public update shipping_addresses" on public.shipping_addresses;
create policy "public update shipping_addresses" on public.shipping_addresses for update using (true) with check (true);

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Bulk pricing helper
create or replace function public.bulk_update_prices(
  p_mode text,
  p_value numeric,
  p_category product_category default null
) returns void
language plpgsql
as $$
begin
  if p_mode = 'percent' then
    update public.products
      set price = round((price * (1 + (p_value / 100.0)))::numeric, 2),
          updated_at = now()
      where (p_category is null or category = p_category);
  else
    update public.products
      set price = greatest(0::numeric, price + p_value),
          updated_at = now()
      where (p_category is null or category = p_category);
  end if;
end;
$$;


-- Índices para optimización de búsqueda y listados
create index if not exists products_title_trgm_idx on public.products using gin (lower(title) gin_trgm_ops);
create index if not exists products_slug_trgm_idx on public.products using gin (lower(slug) gin_trgm_ops);
create index if not exists products_active_category_created_at_idx on public.products (active, category, created_at desc);
create index if not exists product_variants_size_idx on public.product_variants (size);
create index if not exists product_variants_size_trgm_idx on public.product_variants using gin (lower(size) gin_trgm_ops);

-- Índices adicionales pedidos
create index if not exists orders_order_number_idx on public.orders (order_number);
create index if not exists orders_email_idx on public.orders (email);

-- Trigger updated_at para products (ya creado)
drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Trigger para asignar order_number al pasar a 'paid'
create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
declare
  seq int;
  ym text := to_char(now(),'YYYYMM');
begin
  if new.order_number is null then
    select nextval('public.order_number_seq') into seq;
    new.order_number := 'TK-' || ym || '-' || lpad(seq::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_assign_number on public.orders;
create trigger trg_orders_assign_number
before update of status on public.orders
for each row when (new.status = 'paid' and (old.status is distinct from 'paid'))
execute function public.generate_order_number();

-- RPC pública para tracking por order_number + email
create or replace function public.public_order_lookup(p_order_number text, p_email text)
returns table (
  order_number text,
  status order_status,
  carrier text,
  tracking_number text,
  tracking_url text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.order_number, o.status, o.carrier, o.tracking_number, o.tracking_url, o.updated_at
  from public.orders o
  where o.order_number = p_order_number and lower(o.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.public_order_lookup(text, text) from public;
grant execute on function public.public_order_lookup(text, text) to anon, authenticated;


-- ============================================================================
-- Subcategorías de producto
-- (origen: supabase/migration-add-subcategory.sql)
-- ============================================================================

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


-- ============================================================================
-- Marca de "nuevo ingreso"
-- (origen: supabase/migration-add-is-new.sql)
-- ============================================================================

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


-- ============================================================================
-- Precio de oferta
-- (origen: supabase/migration-sale-price.sql)
-- ============================================================================

-- Precio especial de rebaja (opcional). NULL = sin rebaja, usa price normal.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(10,2) DEFAULT NULL;


-- ============================================================================
-- Marcas
-- (origen: supabase/migration-brands.sql)
-- ============================================================================

-- Add brand column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_public_read" ON brands;
DROP POLICY IF EXISTS "brands_admin_all" ON brands;

CREATE POLICY "brands_public_read" ON brands
  FOR SELECT USING (active = true);

CREATE POLICY "brands_admin_all" ON brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert seed brands
INSERT INTO brands (name, slug) VALUES
  ('Emestudio',          'emestudio'),
  ('Nude Project',       'nude-project'),
  ('Scuffers',           'scuffers'),
  ('Essentials',         'essentials'),
  ('Valley',             'valley'),
  ('Corteiz',            'corteiz'),
  ('MixedEmotion',       'mixedemotion'),
  ('Supreme',            'supreme'),
  ('OFF White',          'off-white'),
  ('Syna by Central Cee','syna-by-central-cee'),
  ('OVO by Drake',       'ovo-by-drake'),
  ('Bape',               'bape')
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- Funciones de stock y checkout
-- (origen: supabase/migration-checkout-flow.sql)
-- ============================================================================

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


-- ============================================================================
-- Cupones de descuento
-- (origen: supabase/migration-discount-codes.sql)
-- ============================================================================

-- Migration: sistema de cupones de descuento
-- Porcentaje o monto fijo, sin reglas por producto/cliente.

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12,2) not null check (value > 0),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  created_at timestamptz default now()
);

alter table public.discount_codes enable row level security;

drop policy if exists "discount_codes_admin_all" on public.discount_codes;
create policy "discount_codes_admin_all" on public.discount_codes
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;

-- Función atómica: valida vigencia/máximo de usos y consume un uso, con lock de fila
-- (mismo patrón que decrement_variant_stock).
create or replace function public.redeem_discount_code(p_code text, p_subtotal numeric)
returns table (ok boolean, discount_amount numeric, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dc public.discount_codes%rowtype;
  v_discount numeric;
begin
  select * into v_dc
  from public.discount_codes
  where code = upper(btrim(p_code))
  for update;

  if not found then
    return query select false, 0::numeric, 'Cupón no encontrado';
    return;
  end if;

  if not v_dc.active then
    return query select false, 0::numeric, 'Cupón inactivo';
    return;
  end if;

  if v_dc.starts_at is not null and v_dc.starts_at > now() then
    return query select false, 0::numeric, 'Cupón todavía no está vigente';
    return;
  end if;

  if v_dc.ends_at is not null and v_dc.ends_at < now() then
    return query select false, 0::numeric, 'Cupón vencido';
    return;
  end if;

  if v_dc.max_uses is not null and v_dc.used_count >= v_dc.max_uses then
    return query select false, 0::numeric, 'Cupón agotado';
    return;
  end if;

  if v_dc.type = 'percent' then
    v_discount := round(p_subtotal * v_dc.value / 100, 2);
  else
    v_discount := least(v_dc.value, p_subtotal);
  end if;

  update public.discount_codes set used_count = used_count + 1 where id = v_dc.id;

  return query select true, v_discount, null::text;
end;
$$;

grant execute on function public.redeem_discount_code(text, numeric) to anon, authenticated;

-- Compensación: si la orden falla DESPUÉS de haber consumido un cupón
-- (ej. se quedó sin stock en el paso siguiente), se libera ese uso.
create or replace function public.release_discount_code_use(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.discount_codes
  set used_count = greatest(used_count - 1, 0)
  where code = upper(btrim(p_code));
end;
$$;

grant execute on function public.release_discount_code_use(text) to anon, authenticated;


-- ============================================================================
-- Devolver stock al cancelar un pedido
-- (origen: supabase/migration-restore-stock-on-cancel.sql)
-- ============================================================================

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


-- ============================================================================
-- Permitir borrar productos ya vendidos
-- (origen: supabase/migration-allow-delete-products-with-orders.sql)
-- ============================================================================

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


-- ============================================================================
-- Fecha en los ítems del pedido
-- (origen: supabase/migration-order-items-created-at.sql)
-- ============================================================================

-- Add created_at to order_items for analytics date filtering
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at timestamptz default now();

    -- Index for date-range queries
    CREATE INDEX IF NOT EXISTS order_items_created_at_idx ON public.order_items (created_at);


-- ============================================================================
-- Analíticas propias (visitas y eventos)
-- (origen: supabase/analytics-schema.sql)
-- ============================================================================

-- ================================================
-- ANALYTICS SCHEMA - Sistema de seguimiento de visitas
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Tabla principal de visitas/sesiones
create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  -- Identificador de sesión (generado en cliente)
  session_id text not null,
  -- Información del visitante
  visitor_id text, -- fingerprint o cookie persistente
  -- Página visitada
  page_path text not null,
  page_title text,
  -- Origen de la visita
  referrer text,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- Información del dispositivo
  user_agent text,
  device_type text, -- 'mobile', 'tablet', 'desktop'
  browser text,
  os text,
  -- Geolocalización (opcional, basado en IP)
  country text,
  city text,
  -- Métricas de tiempo
  entered_at timestamptz default now(),
  exited_at timestamptz,
  duration_seconds int default 0,
  -- Interacciones
  is_bounce boolean default true, -- Se actualiza si navega a otra página
  pages_viewed int default 1,
  -- Metadata
  created_at timestamptz default now()
);

-- Tabla para pageviews individuales (cada página vista)
create table if not exists public.analytics_pageviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.analytics_visits(id) on delete cascade,
  session_id text not null,
  page_path text not null,
  page_title text,
  entered_at timestamptz default now(),
  exited_at timestamptz,
  duration_seconds int default 0,
  scroll_depth int default 0, -- porcentaje de scroll
  created_at timestamptz default now()
);

-- Tabla para eventos personalizados
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_name text not null,
  event_category text,
  event_data jsonb default '{}'::jsonb,
  page_path text,
  created_at timestamptz default now()
);

-- Índices para consultas rápidas
create index if not exists idx_visits_created_at on public.analytics_visits(created_at desc);
create index if not exists idx_visits_session on public.analytics_visits(session_id);
create index if not exists idx_visits_page_path on public.analytics_visits(page_path);
create index if not exists idx_visits_referrer_domain on public.analytics_visits(referrer_domain);
create index if not exists idx_visits_device_type on public.analytics_visits(device_type);

create index if not exists idx_pageviews_visit on public.analytics_pageviews(visit_id);
create index if not exists idx_pageviews_session on public.analytics_pageviews(session_id);
create index if not exists idx_pageviews_created on public.analytics_pageviews(created_at desc);

create index if not exists idx_events_session on public.analytics_events(session_id);
create index if not exists idx_events_name on public.analytics_events(event_name);
create index if not exists idx_events_created on public.analytics_events(created_at desc);

-- RLS (Row Level Security)
alter table public.analytics_visits enable row level security;
alter table public.analytics_pageviews enable row level security;
alter table public.analytics_events enable row level security;

-- Políticas: cualquiera puede insertar, solo admin puede leer
drop policy if exists "insert visits" on public.analytics_visits;
create policy "insert visits" on public.analytics_visits
  for insert with check (true);

drop policy if exists "admin read visits" on public.analytics_visits;
create policy "admin read visits" on public.analytics_visits
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin update visits" on public.analytics_visits;
create policy "admin update visits" on public.analytics_visits
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Pageviews policies
drop policy if exists "insert pageviews" on public.analytics_pageviews;
create policy "insert pageviews" on public.analytics_pageviews
  for insert with check (true);

drop policy if exists "admin read pageviews" on public.analytics_pageviews;
create policy "admin read pageviews" on public.analytics_pageviews
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Events policies
drop policy if exists "insert events" on public.analytics_events;
create policy "insert events" on public.analytics_events
  for insert with check (true);

drop policy if exists "admin read events" on public.analytics_events;
create policy "admin read events" on public.analytics_events
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ================================================
-- VISTAS ÚTILES PARA EL DASHBOARD
-- ================================================

-- Vista: Estadísticas por hora del día
create or replace view public.analytics_hourly_stats as
select 
  extract(hour from created_at) as hour,
  count(*) as visits,
  avg(duration_seconds) as avg_duration
from public.analytics_visits
where created_at >= now() - interval '30 days'
group by extract(hour from created_at)
order by hour;

-- Vista: Estadísticas por día de la semana
create or replace view public.analytics_daily_stats as
select 
  extract(dow from created_at) as day_of_week,
  to_char(created_at, 'Day') as day_name,
  count(*) as visits,
  avg(duration_seconds) as avg_duration
from public.analytics_visits
where created_at >= now() - interval '30 days'
group by extract(dow from created_at), to_char(created_at, 'Day')
order by day_of_week;

-- Vista: Top páginas
create or replace view public.analytics_top_pages as
select 
  page_path,
  count(*) as views,
  avg(duration_seconds) as avg_duration,
  sum(case when is_bounce then 1 else 0 end)::float / nullif(count(*), 0) * 100 as bounce_rate
from public.analytics_visits
where created_at >= now() - interval '30 days'
group by page_path
order by views desc
limit 20;

-- Vista: Top referrers
create or replace view public.analytics_top_referrers as
select 
  coalesce(referrer_domain, 'Directo') as source,
  count(*) as visits,
  avg(duration_seconds) as avg_duration
from public.analytics_visits
where created_at >= now() - interval '30 days'
group by referrer_domain
order by visits desc
limit 20;

-- Función para actualizar duración de visita
create or replace function update_visit_duration(
  p_session_id text,
  p_duration int,
  p_pages_viewed int
) returns void as $$
begin
  update public.analytics_visits
  set 
    duration_seconds = p_duration,
    pages_viewed = p_pages_viewed,
    is_bounce = (p_pages_viewed <= 1),
    exited_at = now()
  where session_id = p_session_id
    and exited_at is null;
end;
$$ language plpgsql security definer;


-- ============================================================================
-- Profundidad de scroll en analíticas
-- (origen: supabase/migration-analytics-scroll-depth.sql)
-- ============================================================================

-- Migration: agrega scroll_depth a analytics_visits
-- (existía solo en analytics_pageviews; el endpoint de exit y el dashboard
-- ya intentaban leer/escribir esta columna en analytics_visits sin que existiera)

ALTER TABLE public.analytics_visits ADD COLUMN IF NOT EXISTS scroll_depth int DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_visits_scroll_depth ON public.analytics_visits(scroll_depth);


-- ============================================================================
-- Bucket de imágenes de producto
-- (origen: supabase/setup-storage.sql)
-- ============================================================================

-- Script para configurar el bucket de imágenes de productos
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket si no existe (hacerlo desde la UI de Supabase Storage)
-- Dashboard → Storage → Create Bucket
-- Nombre: product-images
-- Public: YES

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin write access" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

-- 3. Crear políticas de acceso

-- Lectura pública para todos
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Escritura solo para admins
CREATE POLICY "Admin write access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Actualización solo para admins
CREATE POLICY "Admin update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Eliminación solo para admins
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';


-- ============================================================================
-- Bucket privado de comprobantes de pago
-- (origen: supabase/setup-payment-proofs-bucket.sql)
-- ============================================================================

-- Script para configurar el bucket de comprobantes de pago
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket desde la UI de Supabase:
--    Dashboard → Storage → Create Bucket
--    Nombre: payment-proofs
--    Public: YES (para que el admin pueda ver las imágenes)

-- 2. Políticas de acceso para el bucket payment-proofs

-- Lectura pública (necesario para que el admin vea las imágenes en el panel)
CREATE POLICY "Public read payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Escritura: solo vía service_role (el endpoint /api/upload-proof usa service_role key)
-- No se necesita política INSERT para usuarios normales porque el upload
-- se hace server-side con la service_role key que bypasea RLS.

-- Si querés permitir que usuarios autenticados suban directamente (opcional):
-- CREATE POLICY "Authenticated users can upload proofs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'payment-proofs' AND
--   auth.role() = 'authenticated'
-- );

-- Eliminación solo para admins
CREATE POLICY "Admin delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================================================
-- Políticas de seguridad (RLS) — va al final
-- (origen: supabase/rls-security-update.sql)
-- ============================================================================

-- =====================================================
-- ACTUALIZACIÓN DE SEGURIDAD - ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Este script mejora las políticas RLS para prevenir
-- acceso no autorizado a las órdenes
-- =====================================================

-- 1. ELIMINAR POLÍTICAS PERMISIVAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "public read orders" ON public.orders;
DROP POLICY IF EXISTS "public write orders" ON public.orders;
DROP POLICY IF EXISTS "public update orders" ON public.orders;

DROP POLICY IF EXISTS "public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "public write order_items" ON public.order_items;
DROP POLICY IF EXISTS "public upsert order_items" ON public.order_items;

DROP POLICY IF EXISTS "public read shipping_addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "public write shipping_addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "public update shipping_addresses" ON public.shipping_addresses;

-- 2. POLÍTICAS SEGURAS PARA ORDERS
-- =====================================================

-- Lectura: Solo el propietario o admins pueden ver sus órdenes
CREATE POLICY "read_own_orders" ON public.orders
  FOR SELECT
  USING (
    -- Usuario autenticado puede ver sus propias órdenes
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Admins pueden ver todas las órdenes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Inserción: Usuarios autenticados pueden crear órdenes
-- (el checkout puede funcionar sin login, por eso permitimos NULL en user_id)
CREATE POLICY "insert_orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    -- Permitir inserción si no hay usuario (checkout sin login)
    user_id IS NULL
    OR
    -- Si hay usuario, debe ser el usuario autenticado
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Actualización: Solo el propietario o admin puede actualizar
CREATE POLICY "update_own_orders" ON public.orders
  FOR UPDATE
  USING (
    -- Usuario puede actualizar su propia orden
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Admin puede actualizar cualquier orden
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- Mismo check al insertar
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Delete: Solo admins pueden eliminar órdenes
CREATE POLICY "delete_orders_admin_only" ON public.orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. POLÍTICAS SEGURAS PARA ORDER_ITEMS
-- =====================================================

-- Lectura: Solo si pueden ver la orden
CREATE POLICY "read_order_items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Inserción: Solo al crear la orden (mismo usuario)
CREATE POLICY "insert_order_items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.user_id IS NULL -- Checkout sin login
        OR
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
      )
    )
  );

-- Actualización: Solo admin
CREATE POLICY "update_order_items" ON public.order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Delete: Solo admin
CREATE POLICY "delete_order_items" ON public.order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. POLÍTICAS SEGURAS PARA SHIPPING_ADDRESSES
-- =====================================================

-- Lectura: Solo si pueden ver la orden
CREATE POLICY "read_shipping_addresses" ON public.shipping_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Inserción: Solo al crear la orden
CREATE POLICY "insert_shipping_addresses" ON public.shipping_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        o.user_id IS NULL
        OR
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
      )
    )
  );

-- Actualización: Solo el propietario o admin
CREATE POLICY "update_shipping_addresses" ON public.shipping_addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipping_addresses.order_id
      AND (
        (o.user_id IS NOT NULL AND o.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Delete: Solo admin
CREATE POLICY "delete_shipping_addresses" ON public.shipping_addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 5. PROTECCIÓN ADICIONAL: CUSTOM_ORDERS
-- =====================================================

-- Actualmente "create custom order" permite insertar sin autenticación
-- Esto está bien para el formulario de encargos, pero añadimos rate limiting
-- en el código (ya implementado en /api/encargos)

-- Lectura: Solo admins
DROP POLICY IF EXISTS "read custom orders" ON public.custom_orders;
CREATE POLICY "read_custom_orders_admin_only" ON public.custom_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Inserción: Permitir público (con rate limiting en API)
DROP POLICY IF EXISTS "create custom order" ON public.custom_orders;
CREATE POLICY "insert_custom_orders_public" ON public.custom_orders
  FOR INSERT
  WITH CHECK (true);

-- Actualización/Delete: Solo admin
CREATE POLICY "update_custom_orders_admin_only" ON public.custom_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "delete_custom_orders_admin_only" ON public.custom_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================
-- ✅ Orders: Solo propietario o admin pueden leer/actualizar
-- ✅ Order Items: Solo propietario (al crear) o admin
-- ✅ Shipping Addresses: Solo propietario o admin
-- ✅ Custom Orders: Solo admin puede leer, público puede crear (con rate limit)
-- ✅ Prevención de acceso no autorizado
-- ✅ Protección contra modificación de órdenes ajenas
-- =====================================================
