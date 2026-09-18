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
