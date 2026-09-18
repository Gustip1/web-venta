-- ============================================================================
--  DATOS INICIALES
-- ============================================================================
--
--  Corré esto DESPUÉS de 01-instalacion-completa.sql, en el mismo SQL Editor.
--  Deja la tienda con una configuración de arranque que después se edita
--  cómodamente desde el panel (/admin/ajustes), sin volver a tocar SQL.
-- ============================================================================

-- ── Tipo de cambio ──────────────────────────────────────────────────────────
-- Cuánto vale 1 USD en tu moneda. Se edita en /admin/precios.
insert into public.settings (key, value)
values ('usd_ars_rate', '1000'::jsonb)
on conflict (key) do nothing;

-- ── Configuración de la tienda ──────────────────────────────────────────────
-- Nombre, logo, colores, contacto, redes, cobros y SEO.
-- Todo esto se edita en /admin/ajustes: no hace falta cambiarlo acá.
insert into public.settings (key, value)
values ('store_config', jsonb_build_object(
  'name',    'Mi Tienda',
  'tagline', 'Sneakers & Streetwear',
  'about',   'Contá acá en pocas líneas qué hace especial a tu tienda. Se muestra en el pie de la página.',
  'logoUrl', null,
  'colors',  jsonb_build_object(
    'primary',      '#008060',
    'primaryHover', '#006e52',
    'primaryLight', '#e6f4f1',
    'accent',       '#5c6ac4'
  ),
  'contact', jsonb_build_object('whatsapp', '', 'email', '', 'city', '', 'address', ''),
  'social',  jsonb_build_object('instagram', '', 'tiktok', '', 'facebook', ''),
  'payment', jsonb_build_object('aliasArs', '', 'aliasUsd', '', 'holder', '', 'cryptoWallet', ''),
  'seo',     jsonb_build_object('title', '', 'description', '', 'siteUrl', '', 'metaPixelId', '')
))
on conflict (key) do nothing;

-- ── Aviso emergente (apagado por defecto) ───────────────────────────────────
insert into public.settings (key, value)
values ('account_notice', jsonb_build_object('active', false))
on conflict (key) do nothing;

-- ── Promo de cuotas (apagada por defecto) ───────────────────────────────────
insert into public.settings (key, value)
values ('installments_promo', jsonb_build_object('active', false))
on conflict (key) do nothing;

-- ── Botón "hacer una oferta" (apagado por defecto) ──────────────────────────
insert into public.settings (key, value)
values ('offers_enabled', jsonb_build_object('active', false))
on conflict (key) do nothing;

-- ============================================================================
--  ÚLTIMO PASO: convertirte en administrador
-- ============================================================================
--
--  1. Registrate en tu web (/register) con el mail que vayas a usar de admin.
--  2. Volvé acá, reemplazá el mail de abajo por el tuyo y corré SÓLO esta línea.
--  3. Entrá a /admin — ya tenés el panel.
--
-- update public.profiles
--    set role = 'admin'
--  where id = (select id from auth.users where email = 'TU-MAIL@ejemplo.com');
-- ============================================================================
