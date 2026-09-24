"use client";
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { revalidateHome } from '@/lib/admin/revalidateHome';
import {
  STORE_CONFIG_KEY,
  StoreConfig,
  DEFAULT_STORE_CONFIG,
  mergeStoreConfig,
} from '@/lib/storeConfig';
import {
  InstallmentsPromoContent,
  InstallmentsMode,
  DEFAULT_INSTALLMENTS_PROMO_CONTENT,
} from '@/lib/homeContent';
import {
  ACCOUNT_NOTICE_SETTING_KEY,
  AccountNotice,
  DEFAULT_ACCOUNT_NOTICE,
  mergeAccountNotice,
} from '@/lib/accountNotice';
import {
  ABOUT_CONTENT_KEY,
  AboutContent,
  AboutIcon,
  ABOUT_ICONS,
  ABOUT_ICON_LABELS,
  DEFAULT_ABOUT_CONTENT,
  mergeAboutContent,
} from '@/lib/aboutContent';
import { Store, Palette, Phone, CreditCard, Search, Megaphone, Check, Loader2, Upload, BookOpen, Truck } from 'lucide-react';

type Tab = 'identidad' | 'colores' | 'contacto' | 'pagos' | 'envio' | 'seo' | 'aviso' | 'nosotros';

const TABS: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: 'identidad', label: 'Identidad', icon: Store },
  { id: 'colores', label: 'Colores', icon: Palette },
  { id: 'contacto', label: 'Contacto y redes', icon: Phone },
  { id: 'pagos', label: 'Cobros', icon: CreditCard },
  { id: 'envio', label: 'Envío y cinta', icon: Truck },
  { id: 'seo', label: 'SEO y pixel', icon: Search },
  { id: 'aviso', label: 'Aviso emergente', icon: Megaphone },
  { id: 'nosotros', label: 'Nosotros', icon: BookOpen },
];

/** Paletas listas para usar, para quien no quiere elegir colores a mano. */
const PRESETS: { name: string; colors: StoreConfig['colors'] }[] = [
  { name: 'Verde', colors: { primary: '#008060', primaryHover: '#006e52', primaryLight: '#e6f4f1', accent: '#5c6ac4' } },
  { name: 'Negro', colors: { primary: '#111111', primaryHover: '#000000', primaryLight: '#f2f2f2', accent: '#6b7280' } },
  { name: 'Azul', colors: { primary: '#2563eb', primaryHover: '#1d4ed8', primaryLight: '#e6eeff', accent: '#0ea5e9' } },
  { name: 'Rojo', colors: { primary: '#dc2626', primaryHover: '#b91c1c', primaryLight: '#fee2e2', accent: '#f59e0b' } },
  { name: 'Violeta', colors: { primary: '#7c3aed', primaryHover: '#6d28d9', primaryLight: '#ede9fe', accent: '#ec4899' } },
  { name: 'Naranja', colors: { primary: '#ea580c', primaryHover: '#c2410c', primaryLight: '#ffedd5', accent: '#0d9488' } },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('identidad');
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [notice, setNotice] = useState<AccountNotice>(DEFAULT_ACCOUNT_NOTICE);
  const [instagramToken, setInstagramToken] = useState('');
  const [installments, setInstallments] = useState<InstallmentsPromoContent>(
    DEFAULT_INSTALLMENTS_PROMO_CONTENT
  );
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  // El texto crudo de la cinta: recién al guardar se parte en líneas. Si se
  // filtrara en cada tecla, apretar Enter no haría nada.
  const [bannerText, setBannerText] = useState(DEFAULT_STORE_CONFIG.bannerMessages.join('\n'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          STORE_CONFIG_KEY,
          ACCOUNT_NOTICE_SETTING_KEY,
          'instagram_access_token',
          'installments_promo',
          ABOUT_CONTENT_KEY,
        ]);

      for (const row of data ?? []) {
        if (row.key === STORE_CONFIG_KEY) {
          const merged = mergeStoreConfig(row.value);
          setConfig(merged);
          setBannerText(merged.bannerMessages.join('\n'));
        }
        if (row.key === ACCOUNT_NOTICE_SETTING_KEY) setNotice(mergeAccountNotice(row.value));
        if (row.key === ABOUT_CONTENT_KEY) setAbout(mergeAboutContent(row.value));
        if (row.key === 'installments_promo') {
          setInstallments({
            ...DEFAULT_INSTALLMENTS_PROMO_CONTENT,
            ...(row.value as Partial<InstallmentsPromoContent> | null),
          });
        }
        if (row.key === 'instagram_access_token') {
          setInstagramToken((row.value as { token?: string } | null)?.token ?? '');
        }
      }
      setLoading(false);
    })();
  }, []);

  /** Guarda una key de settings y refresca la home para que el cambio se vea ya. */
  const save = useCallback(async (key: string, value: unknown, okMessage: string) => {
    setSaving(true);
    setMessage(null);
    const supabase = createBrowserClient();
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      setMessage(`No se pudo guardar: ${error.message}`);
    } else {
      setMessage(okMessage);
      await revalidateHome();
    }
    setSaving(false);
  }, []);

  const saveConfig = () => {
    const bannerMessages = bannerText.split('\n').map((l) => l.trim()).filter(Boolean);
    const next = { ...config, bannerMessages };
    setConfig(next);
    return save(STORE_CONFIG_KEY, next, '✓ Guardado. Recargá la tienda para verlo.');
  };
  const saveNotice = () => save(ACCOUNT_NOTICE_SETTING_KEY, notice, '✓ Aviso guardado.');
  const saveAbout = () => save(ABOUT_CONTENT_KEY, about, '✓ Página "Nosotros" guardada.');
  const saveInstallments = () =>
    save('installments_promo', installments, '✓ Cuotas actualizadas.');
  const saveInstagram = () =>
    save('instagram_access_token', { token: instagramToken.trim() }, '✓ Token guardado.');

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('files', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Error al subir');
      const url = Array.isArray(out) ? out[0]?.url : out?.url;
      if (!url) throw new Error('El servidor no devolvió la URL del logo');
      setConfig((c) => ({ ...c, logoUrl: url }));
      setMessage('✓ Logo subido. Acordate de guardar para aplicarlo.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al subir el logo');
    }
    setUploadingLogo(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
      </div>
    );
  }

  const set = <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de la tienda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todo lo de acá se aplica al sitio sin tocar código. Los cambios se ven al recargar la tienda.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setMessage(null); }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              tab === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        {/* ── IDENTIDAD ── */}
        {tab === 'identidad' && (
          <div className="max-w-xl space-y-5">
            <Field label="Nombre de la tienda" hint="Aparece en el menú, el pie y el título del navegador.">
              <input className={inputCls} value={config.name} onChange={(e) => set('name', e.target.value)} />
            </Field>

            <Field label="Bajada corta" hint="Una línea debajo del nombre. Ej: Sneakers & Streetwear.">
              <input className={inputCls} value={config.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </Field>

            <Field label="Sobre la tienda" hint="Párrafo que se muestra en el pie y en la página Nosotros.">
              <textarea rows={4} className={inputCls} value={config.about} onChange={(e) => set('about', e.target.value)} />
            </Field>

            <Field label="Logo" hint="PNG o JPG, idealmente con fondo transparente y al menos 240px de ancho.">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  {config.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logoUrl} alt="Logo actual" className="max-h-14 max-w-28 object-contain" />
                  ) : (
                    <span className="text-[11px] font-bold text-gray-400">Sin logo</span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? 'Subiendo…' : 'Subir logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }}
                    />
                  </label>
                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => set('logoUrl', null)}
                      className="block text-xs font-bold text-gray-500 underline"
                    >
                      Quitar logo y usar el de ejemplo
                    </button>
                  )}
                </div>
              </div>
            </Field>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {/* ── COLORES ── */}
        {tab === 'colores' && (
          <div className="max-w-xl space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Paletas listas</p>
              <p className="mb-3 text-xs text-gray-500">Un clic y quedan cargados los cuatro colores.</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => set('colors', p.colors)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:border-gray-400"
                  >
                    <span className="h-4 w-4 rounded-full" style={{ background: p.colors.primary }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Principal" hint="Botones y acentos."
                value={config.colors.primary}
                onChange={(v) => set('colors', { ...config.colors, primary: v })}
              />
              <ColorField
                label="Principal (hover)" hint="Un tono más oscuro."
                value={config.colors.primaryHover}
                onChange={(v) => set('colors', { ...config.colors, primaryHover: v })}
              />
              <ColorField
                label="Principal claro" hint="Fondos suaves."
                value={config.colors.primaryLight}
                onChange={(v) => set('colors', { ...config.colors, primaryLight: v })}
              />
              <ColorField
                label="Secundario" hint="Detalles puntuales."
                value={config.colors.accent}
                onChange={(v) => set('colors', { ...config.colors, accent: v })}
              />
            </div>

            {/* Vista previa en vivo */}
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Vista previa</p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-lg px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white"
                  style={{ background: config.colors.primary }}
                >
                  Comprar ahora
                </span>
                <span
                  className="rounded-lg border-2 px-4 py-2.5 text-sm font-black uppercase tracking-wide"
                  style={{ borderColor: config.colors.primary, color: config.colors.primary }}
                >
                  Ver más
                </span>
                <span
                  className="rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: config.colors.primaryLight, color: config.colors.primary }}
                >
                  Envíos
                </span>
                <span className="h-8 w-8 rounded-full" style={{ background: config.colors.accent }} />
              </div>
            </div>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {/* ── CONTACTO Y REDES ── */}
        {tab === 'contacto' && (
          <div className="max-w-xl space-y-5">
            <Field label="WhatsApp" hint="Con código de país y sin espacios ni signos. Ej: 5491122334455. Vacío = se esconde el botón flotante.">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="5491122334455"
                value={config.contact.whatsapp}
                onChange={(e) => set('contact', { ...config.contact, whatsapp: e.target.value })}
              />
            </Field>

            <Field label="Email de contacto">
              <input
                className={inputCls}
                type="email"
                placeholder="hola@tutienda.com"
                value={config.contact.email}
                onChange={(e) => set('contact', { ...config.contact, email: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad">
                <input
                  className={inputCls}
                  placeholder="Buenos Aires · Argentina"
                  value={config.contact.city}
                  onChange={(e) => set('contact', { ...config.contact, city: e.target.value })}
                />
              </Field>
              <Field label="Dirección o aclaración">
                <input
                  className={inputCls}
                  placeholder="Showroom con cita previa"
                  value={config.contact.address}
                  onChange={(e) => set('contact', { ...config.contact, address: e.target.value })}
                />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="mb-3 text-sm font-medium text-gray-700">Redes sociales</p>
              <p className="mb-4 text-xs text-gray-500">
                Pegá la URL completa del perfil. Las que dejes vacías no se muestran en la web.
              </p>

              <div className="space-y-4">
                <Field label="Instagram">
                  <input
                    className={inputCls}
                    placeholder="https://www.instagram.com/tutienda"
                    value={config.social.instagram}
                    onChange={(e) => set('social', { ...config.social, instagram: e.target.value })}
                  />
                </Field>
                <Field label="TikTok">
                  <input
                    className={inputCls}
                    placeholder="https://www.tiktok.com/@tutienda"
                    value={config.social.tiktok}
                    onChange={(e) => set('social', { ...config.social, tiktok: e.target.value })}
                  />
                </Field>
                <Field label="Facebook">
                  <input
                    className={inputCls}
                    placeholder="https://www.facebook.com/tutienda"
                    value={config.social.facebook}
                    onChange={(e) => set('social', { ...config.social, facebook: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <SaveButton onClick={saveConfig} saving={saving} />

            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm font-medium text-gray-700">Feed de Instagram (opcional)</p>
              <p className="mb-3 text-xs text-gray-500">
                Para mostrar tus últimas fotos en la home. El token se genera en developers.facebook.com
                con el producto &quot;Instagram API with Instagram Login&quot; y vence cada ~60 días.
              </p>
              <input
                className={inputCls}
                type="password"
                placeholder="IGQ..."
                value={instagramToken}
                onChange={(e) => setInstagramToken(e.target.value)}
              />
              <button
                type="button"
                onClick={saveInstagram}
                disabled={saving}
                className="mt-3 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Guardar token
              </button>
            </div>
          </div>
        )}

        {/* ── COBROS ── */}
        {tab === 'pagos' && (
          <div className="max-w-xl space-y-5">
            <p className="text-sm text-gray-500">
              Estos datos se le muestran al cliente en el checkout cuando elige transferencia. Lo que dejes
              vacío no aparece.
            </p>

            <Field label="Alias o CBU (moneda local)">
              <input
                className={inputCls}
                placeholder="mi.alias.mp"
                value={config.payment.aliasArs}
                onChange={(e) => set('payment', { ...config.payment, aliasArs: e.target.value })}
              />
            </Field>

            <Field label="Alias en dólares (opcional)">
              <input
                className={inputCls}
                value={config.payment.aliasUsd}
                onChange={(e) => set('payment', { ...config.payment, aliasUsd: e.target.value })}
              />
            </Field>

            <Field label="Titular de la cuenta" hint="Para que el cliente confirme a quién le transfiere antes de pagar.">
              <input
                className={inputCls}
                placeholder="Nombre y apellido"
                value={config.payment.holder}
                onChange={(e) => set('payment', { ...config.payment, holder: e.target.value })}
              />
            </Field>

            <Field label="Wallet de cripto (opcional)" hint="Si aceptás USDT u otra cripto.">
              <input
                className={inputCls}
                placeholder="0x..."
                value={config.payment.cryptoWallet}
                onChange={(e) => set('payment', { ...config.payment, cryptoWallet: e.target.value })}
              />
            </Field>

            <SaveButton onClick={saveConfig} saving={saving} />

            {/* ── Pago en cuotas ── */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Pago en 3 cuotas</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Decidí si ofrecés cuotas con tarjeta. Apagadas, no se nombran en ningún lado: ni en la
                  cinta de arriba, ni en el catálogo, ni en la ficha del producto, ni en el checkout.
                </p>
              </div>

              <div className="space-y-2">
                {([
                  { value: 'on', label: 'Activas', hint: 'Se ofrecen normalmente en toda la tienda.' },
                  { value: 'soon', label: 'Próximamente', hint: 'Se anuncian, pero todavía no se pueden elegir al pagar.' },
                  { value: 'off', label: 'Apagadas', hint: 'No se muestran en ninguna parte de la web.' },
                ] as { value: InstallmentsMode; label: string; hint: string }[]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                      installments.mode === opt.value
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="installments-mode"
                      className="mt-1 h-4 w-4"
                      checked={installments.mode === opt.value}
                      onChange={() => setInstallments((p) => ({ ...p, mode: opt.value }))}
                    />
                    <span>
                      <span className="block text-sm font-bold text-gray-900">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {installments.mode === 'soon' && (
                <Field label="Texto del cartel" hint="Lo que se lee donde antes iban las cuotas.">
                  <input
                    className={inputCls}
                    placeholder="Cuotas próximamente"
                    value={installments.soonLabel}
                    onChange={(e) => setInstallments((p) => ({ ...p, soonLabel: e.target.value }))}
                  />
                </Field>
              )}

              {installments.mode === 'on' && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={installments.active}
                    onChange={(e) => setInstallments((p) => ({ ...p, active: e.target.checked }))}
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-900">Promo sin recargo</span>
                    <span className="block text-xs text-gray-500">
                      Las 3 cuotas salen lo mismo que en efectivo (sin el 10% de recargo) y se muestra el
                      cartel de promo en toda la tienda.
                    </span>
                  </span>
                </label>
              )}

              <SaveButton onClick={saveInstallments} saving={saving} />
            </div>
          </div>
        )}

        {/* ── ENVÍO Y CINTA ── */}
        {tab === 'envio' && (
          <div className="max-w-xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Costo del envío</h2>
              <p className="mt-1 text-sm text-gray-500">
                Se cobra cuando el cliente elige envío a domicilio y se suma al total del pedido. En
                moneda local, no en dólares.
              </p>
            </div>

            <Field label="Precio del envío" hint="Poné 0 si todavía no tenés un precio fijo.">
              <input
                type="number"
                min={0}
                step="1"
                className={inputCls}
                value={config.shipping.cost}
                onChange={(e) =>
                  set('shipping', { ...config.shipping, cost: Number(e.target.value) || 0 })
                }
              />
            </Field>

            <Field
              label="Qué decir cuando el precio es 0"
              hint="Se muestra en el checkout y en la ficha del producto en lugar del monto."
            >
              <input
                className={inputCls}
                placeholder="A coordinar"
                value={config.shipping.note}
                onChange={(e) => set('shipping', { ...config.shipping, note: e.target.value })}
              />
            </Field>

            <div className="border-t border-gray-200 pt-5">
              <h2 className="text-base font-bold text-gray-900">Cinta de arriba</h2>
              <p className="mt-1 text-sm text-gray-500">
                Los mensajes que van pasando en la barra negra, arriba de todo. Uno por línea. El aviso
                de cuotas se agrega solo cuando están activas (se configura en Cobros).
              </p>
            </div>

            <Field label="Mensajes" hint="Podés usar emojis. Si borrás todos, la cinta queda sólo con el dólar.">
              <textarea
                className={inputCls}
                rows={5}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
              />
            </Field>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {/* ── NOSOTROS ── */}
        {tab === 'nosotros' && (
          <div className="max-w-xl space-y-5">
            <p className="text-sm text-gray-500">
              Los textos de la página <strong>/nosotros</strong>: tu historia, cómo trabajan y los números
              que quieras destacar.
            </p>

            <Field label="Título grande" hint="Se muestra en dos líneas, arriba de todo.">
              <input
                className={inputCls}
                value={about.heroTitle}
                onChange={(e) => setAbout((p) => ({ ...p, heroTitle: e.target.value }))}
              />
            </Field>
            <Field label="Segunda línea del título" hint="Se ve en gris claro, debajo de la anterior.">
              <input
                className={inputCls}
                value={about.heroTitleHighlight}
                onChange={(e) => setAbout((p) => ({ ...p, heroTitleHighlight: e.target.value }))}
              />
            </Field>

            <div className="border-t border-gray-200 pt-5">
              <h2 className="text-base font-bold text-gray-900">Cómo trabajan</h2>
            </div>

            <Field label="Título de la sección">
              <input
                className={inputCls}
                value={about.valuesTitle}
                onChange={(e) => setAbout((p) => ({ ...p, valuesTitle: e.target.value }))}
              />
            </Field>
            <Field label="Bajada">
              <input
                className={inputCls}
                value={about.valuesSubtitle}
                onChange={(e) => setAbout((p) => ({ ...p, valuesSubtitle: e.target.value }))}
              />
            </Field>

            {about.values.map((v, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-400">
                    Tarjeta {i + 1}
                  </span>
                  <select
                    className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900"
                    value={v.icon}
                    onChange={(e) =>
                      setAbout((p) => ({
                        ...p,
                        values: p.values.map((x, j) =>
                          j === i ? { ...x, icon: e.target.value as AboutIcon } : x
                        ),
                      }))
                    }
                  >
                    {ABOUT_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {ABOUT_ICON_LABELS[icon]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className={inputCls}
                  placeholder="Título"
                  value={v.title}
                  onChange={(e) =>
                    setAbout((p) => ({
                      ...p,
                      values: p.values.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                    }))
                  }
                />
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Descripción"
                  value={v.desc}
                  onChange={(e) =>
                    setAbout((p) => ({
                      ...p,
                      values: p.values.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)),
                    }))
                  }
                />
              </div>
            ))}

            <div className="border-t border-gray-200 pt-5">
              <h2 className="text-base font-bold text-gray-900">Su historia</h2>
            </div>

            <Field label="Antetítulo" hint="El texto chico en mayúsculas, arriba del título.">
              <input
                className={inputCls}
                value={about.storyEyebrow}
                onChange={(e) => setAbout((p) => ({ ...p, storyEyebrow: e.target.value }))}
              />
            </Field>
            <Field label="Título" hint='Por ejemplo, "Por qué arrancamos".'>
              <input
                className={inputCls}
                value={about.storyTitle}
                onChange={(e) => setAbout((p) => ({ ...p, storyTitle: e.target.value }))}
              />
            </Field>
            <Field label="La historia" hint="Un párrafo por línea. Dejá una línea vacía entre uno y otro si querés.">
              <textarea
                className={inputCls}
                rows={6}
                value={about.storyText}
                onChange={(e) => setAbout((p) => ({ ...p, storyText: e.target.value }))}
              />
            </Field>
            <Field label="Lista con tildes" hint="Un ítem por línea.">
              <textarea
                className={inputCls}
                rows={3}
                value={about.storyBullets}
                onChange={(e) => setAbout((p) => ({ ...p, storyBullets: e.target.value }))}
              />
            </Field>

            <div className="border-t border-gray-200 pt-5">
              <h2 className="text-base font-bold text-gray-900">Los cuatro números</h2>
              <p className="mt-1 text-sm text-gray-500">
                Los recuadros del costado de la historia.
              </p>
            </div>

            {about.stats.map((st, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                {(['value', 'label', 'hint'] as const).map((campo) => (
                  <input
                    key={campo}
                    className={inputCls}
                    placeholder={campo === 'value' ? 'Número' : campo === 'label' ? 'Palabra' : 'Aclaración'}
                    value={st[campo]}
                    onChange={(e) =>
                      setAbout((p) => ({
                        ...p,
                        stats: p.stats.map((x, j) => (j === i ? { ...x, [campo]: e.target.value } : x)),
                      }))
                    }
                  />
                ))}
              </div>
            ))}

            <SaveButton onClick={saveAbout} saving={saving} />
          </div>
        )}

        {/* ── SEO Y PIXEL ── */}
        {tab === 'seo' && (
          <div className="max-w-xl space-y-5">
            <Field label="Título del sitio" hint="Lo que se ve en la pestaña del navegador y en Google. Vacío = nombre + bajada.">
              <input
                className={inputCls}
                value={config.seo.title}
                onChange={(e) => set('seo', { ...config.seo, title: e.target.value })}
              />
            </Field>

            <Field label="Descripción" hint="El párrafo que aparece debajo del título en Google. Hasta 160 caracteres.">
              <textarea
                rows={3}
                className={inputCls}
                value={config.seo.description}
                onChange={(e) => set('seo', { ...config.seo, description: e.target.value })}
              />
            </Field>

            <Field label="Dominio" hint="Con https:// y sin barra al final. Se usa para el sitemap y al compartir links.">
              <input
                className={inputCls}
                placeholder="https://tutienda.com"
                value={config.seo.siteUrl}
                onChange={(e) => set('seo', { ...config.seo, siteUrl: e.target.value })}
              />
            </Field>

            <Field label="ID del Pixel de Meta (opcional)" hint="Sólo el número. Si lo dejás vacío no se carga ningún script de Meta.">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="123456789012345"
                value={config.seo.metaPixelId}
                onChange={(e) => set('seo', { ...config.seo, metaPixelId: e.target.value })}
              />
            </Field>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {/* ── AVISO EMERGENTE ── */}
        {tab === 'aviso' && (
          <div className="max-w-xl space-y-5">
            <p className="text-sm text-gray-500">
              Un cartel que aparece al entrar a la tienda y que hay que aceptar para seguir. Se muestra una
              vez por visita. Útil para avisar una demora, vacaciones o un cambio importante.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNotice((n) => ({ ...n, active: !n.active }))}
                role="switch"
                aria-checked={notice.active}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  notice.active ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    notice.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {notice.active ? 'Activo — se muestra al entrar' : 'Inactivo'}
              </span>
            </div>

            <Field label="Etiqueta" hint="El texto chico de arriba. Podés usar emojis.">
              <input className={inputCls} value={notice.badge} onChange={(e) => setNotice({ ...notice, badge: e.target.value })} />
            </Field>

            <Field label="Título">
              <input className={inputCls} value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} />
            </Field>

            <Field label="Mensaje" hint="Se respetan los saltos de línea.">
              <textarea rows={5} className={inputCls} value={notice.message} onChange={(e) => setNotice({ ...notice, message: e.target.value })} />
            </Field>

            <Field label="Frase destacada (opcional)" hint="Se muestra en cursiva, con una barra de color al costado.">
              <input className={inputCls} value={notice.aside} onChange={(e) => setNotice({ ...notice, aside: e.target.value })} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Botón extra: texto (opcional)">
                <input className={inputCls} placeholder="Seguinos en TikTok" value={notice.ctaLabel} onChange={(e) => setNotice({ ...notice, ctaLabel: e.target.value })} />
              </Field>
              <Field label="Botón extra: link">
                <input className={inputCls} placeholder="https://..." value={notice.ctaUrl} onChange={(e) => setNotice({ ...notice, ctaUrl: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Texto del botón de cerrar">
                <input className={inputCls} value={notice.accept} onChange={(e) => setNotice({ ...notice, accept: e.target.value })} />
              </Field>
              <Field label="Firma (opcional)">
                <input className={inputCls} placeholder="— El equipo" value={notice.signature} onChange={(e) => setNotice({ ...notice, signature: e.target.value })} />
              </Field>
            </div>

            <SaveButton onClick={saveNotice} saving={saving} />
          </div>
        )}

        {message && (
          <p className={`mt-4 text-sm font-medium ${message.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mb-1.5 mt-0.5 text-xs text-gray-500">{hint}</p>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
    </div>
  );
}

function ColorField({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-gray-300"
          aria-label={`Elegir color ${label}`}
        />
        <input
          className={`${inputCls} font-mono`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {saving ? 'Guardando…' : 'Guardar cambios'}
    </button>
  );
}
