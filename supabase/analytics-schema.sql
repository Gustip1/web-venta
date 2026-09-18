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
