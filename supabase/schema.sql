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

