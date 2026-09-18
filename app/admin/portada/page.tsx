"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';
import { Brand } from '@/types/db';
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import { revalidateHome } from '@/lib/admin/revalidateHome';
import {
  HeroContent,
  DEFAULT_HERO_CONTENT,
  HowToBuyContent,
  DEFAULT_HOW_TO_BUY_CONTENT,
  PromoBannerContent,
  DEFAULT_PROMO_BANNER_CONTENT,
} from '@/lib/homeContent';

const CATS = [
  { label: 'Remeras',    sub: 'remeras' },
  { label: 'Hoodies',    sub: 'hoodies' },
  { label: 'Pantalones', sub: 'pantalones' },
  { label: 'Sneakers',   sub: 'sneakers' },
] as const;

type TileConfig = { sub: string; label?: string; url?: string };
type HomeBrandEntry = {
  id: string;
  kind: 'brand' | 'sneakers';
  slug?: string;
  title: string;
  eyebrow?: string;
};

export default function AdminPortadaPage() {
  const [tiles, setTiles] = useState<Record<string, UploadedImage[]>>({});
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [entries, setEntries] = useState<HomeBrandEntry[]>([]);
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
  const [howToBuy, setHowToBuy] = useState<HowToBuyContent>(DEFAULT_HOW_TO_BUY_CONTENT);
  const [banner, setBanner] = useState<PromoBannerContent>(DEFAULT_PROMO_BANNER_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const [catRes, brandRes, brandsTable, heroRes, howToBuyRes, bannerRes] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'homepage_categories').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'homepage_brands').maybeSingle(),
        supabase.from('brands').select('*').eq('active', true).order('name'),
        supabase.from('settings').select('value').eq('key', 'homepage_hero').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'homepage_how_to_buy').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'homepage_banner').maybeSingle(),
      ]);

      // Imágenes de categorías
      const cfg = (catRes.data?.value as TileConfig[] | null) || [];
      const next: Record<string, UploadedImage[]> = {};
      CATS.forEach((c) => {
        const found = Array.isArray(cfg) ? cfg.find((t) => t.sub === c.sub) : undefined;
        next[c.sub] = found?.url ? [{ url: found.url, alt: c.label }] : [];
      });
      setTiles(next);

      // Marcas disponibles
      setAllBrands((brandsTable.data || []) as Brand[]);

      // Marcas configuradas en la home
      const brandCfg = brandRes.data?.value as HomeBrandEntry[] | null;
      setEntries(Array.isArray(brandCfg) ? brandCfg : []);

      // Contenido editable: hero, cómo comprar, banner
      setHero({ ...DEFAULT_HERO_CONTENT, ...(heroRes.data?.value as Partial<HeroContent> | undefined) });
      setHowToBuy({ ...DEFAULT_HOW_TO_BUY_CONTENT, ...(howToBuyRes.data?.value as Partial<HowToBuyContent> | undefined) });
      setBanner({ ...DEFAULT_PROMO_BANNER_CONTENT, ...(bannerRes.data?.value as Partial<PromoBannerContent> | undefined) });

      setLoading(false);
    })();
  }, []);

  const updateHowToBuyStep = (index: number, patch: Partial<HowToBuyContent['steps'][number]>) => {
    setHowToBuy((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const setSlot = (sub: string, imgs: UploadedImage[]) => {
    setTiles((prev) => ({ ...prev, [sub]: imgs.slice(-1) }));
  };

  const move = (index: number, dir: -1 | 1) => {
    setEntries((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const updateEntry = (id: string, patch: Partial<HomeBrandEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const addBrand = (b: Brand) =>
    setEntries((prev) => [
      ...prev,
      { id: b.slug, kind: 'brand', slug: b.slug, title: b.name, eyebrow: 'Marca destacada' },
    ]);

  const addSneakers = () =>
    setEntries((prev) => [...prev, { id: 'sneakers', kind: 'sneakers', title: 'Sneakers', eyebrow: 'Calzado' }]);

  const usedIds = new Set(entries.map((e) => e.id));
  const availableBrands = allBrands.filter((b) => !usedIds.has(b.slug));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const supabase = createBrowserClient();

    const categoriesValue: TileConfig[] = CATS.map((c) => ({
      sub: c.sub,
      label: c.label,
      url: tiles[c.sub]?.[0]?.url || undefined,
    }));

    const results = await Promise.all([
      supabase.from('settings').upsert({ key: 'homepage_categories', value: categoriesValue }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'homepage_brands', value: entries }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'homepage_hero', value: hero }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'homepage_how_to_buy', value: howToBuy }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'homepage_banner', value: banner }, { onConflict: 'key' }),
    ]);

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      setMessage(`Error al guardar: ${firstError.message}`);
    } else {
      setMessage('✓ Portada guardada correctamente');
      await revalidateHome();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-10 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portada</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurá las imágenes de las categorías y qué marcas se muestran en la home (y en qué orden).
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : (
        <>
          {/* ── Imágenes de categorías ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Imágenes de categorías</h2>
              <p className="text-sm text-gray-500">
                Si no subís ninguna, se usa la última foto del producto más reciente de esa categoría.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {CATS.map((c) => (
                <div key={c.sub} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">{c.label}</h3>
                    {tiles[c.sub]?.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">Imagen elegida</span>
                    )}
                  </div>
                  <ImageUploader value={tiles[c.sub] || []} onChange={(imgs) => setSlot(c.sub, imgs)} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Marcas en la home ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Marcas en la home</h2>
              <p className="text-sm text-gray-500">
                Elegí qué secciones de marca aparecen y ordenálas. Cada una muestra un carrusel con sus productos.
              </p>
            </div>

            {entries.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                No hay marcas seleccionadas. La home usará la configuración por defecto hasta que agregues alguna.
              </p>
            )}

            <div className="space-y-3">
              {entries.map((e, i) => (
                <div key={e.id} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      aria-label="Subir"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === entries.length - 1}
                      className="p-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      aria-label="Bajar"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Título</label>
                      <input
                        value={e.title}
                        onChange={(ev) => updateEntry(e.id, { title: ev.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Subtítulo</label>
                      <input
                        value={e.eyebrow || ''}
                        onChange={(ev) => updateEntry(e.id, { eyebrow: ev.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase">
                      {e.kind === 'sneakers' ? 'Categoría' : e.slug}
                    </span>
                    <button
                      onClick={() => remove(e.id)}
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                      aria-label="Quitar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar sección</p>
              <div className="flex flex-wrap gap-2">
                {availableBrands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => addBrand(b)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> {b.name}
                  </button>
                ))}
                {!usedIds.has('sneakers') && (
                  <button
                    onClick={addSneakers}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Sneakers (calzado)
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── Hero ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Hero (portada principal)</h2>
              <p className="text-sm text-gray-500">El primer texto que ve cualquiera que entra al sitio.</p>
            </div>
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Badge" value={hero.badge} onChange={(v) => setHero((h) => ({ ...h, badge: v }))} />
              <div />
              <Field label="Título (antes del destacado)" value={hero.headlinePre} onChange={(v) => setHero((h) => ({ ...h, headlinePre: v }))} />
              <Field label="Título (destacado, con degradé)" value={hero.headlineHighlight} onChange={(v) => setHero((h) => ({ ...h, headlineHighlight: v }))} />
              <Field label="Título (después del destacado)" value={hero.headlinePost} onChange={(v) => setHero((h) => ({ ...h, headlinePost: v }))} />
              <div />
              <Field label="Subtítulo (antes del negrita)" value={hero.subtitlePre} onChange={(v) => setHero((h) => ({ ...h, subtitlePre: v }))} />
              <Field label="Subtítulo (negrita)" value={hero.subtitleBold} onChange={(v) => setHero((h) => ({ ...h, subtitleBold: v }))} />
              <Field label="Subtítulo (después del negrita)" value={hero.subtitlePost} onChange={(v) => setHero((h) => ({ ...h, subtitlePost: v }))} />
              <div />
              <Field label="Botón principal — texto" value={hero.ctaPrimaryLabel} onChange={(v) => setHero((h) => ({ ...h, ctaPrimaryLabel: v }))} />
              <Field label="Botón principal — link" value={hero.ctaPrimaryHref} onChange={(v) => setHero((h) => ({ ...h, ctaPrimaryHref: v }))} />
              <Field label="Botón secundario — texto" value={hero.ctaSecondaryLabel} onChange={(v) => setHero((h) => ({ ...h, ctaSecondaryLabel: v }))} />
              <Field label="Botón secundario — link" value={hero.ctaSecondaryHref} onChange={(v) => setHero((h) => ({ ...h, ctaSecondaryHref: v }))} />
              <Field label="Pill de confianza 1" value={hero.trustPill1} onChange={(v) => setHero((h) => ({ ...h, trustPill1: v }))} />
              <Field label="Pill de confianza 2" value={hero.trustPill2} onChange={(v) => setHero((h) => ({ ...h, trustPill2: v }))} />
            </div>
          </section>

          {/* ── Cómo comprar ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">¿Cómo comprar?</h2>
              <p className="text-sm text-gray-500">Los 3 pasos que se muestran antes del footer, y el mensaje prearmado de WhatsApp.</p>
            </div>
            <div className="space-y-3">
              {howToBuy.steps.map((step, i) => (
                <div key={i} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-[80px_1fr_2fr] gap-3 items-start">
                  <Field label="Emoji" value={step.icon} onChange={(v) => updateHowToBuyStep(i, { icon: v })} />
                  <Field label={`Paso ${i + 1} — título`} value={step.title} onChange={(v) => updateHowToBuyStep(i, { title: v })} />
                  <Field label={`Paso ${i + 1} — descripción`} value={step.desc} onChange={(v) => updateHowToBuyStep(i, { desc: v })} />
                </div>
              ))}
            </div>
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="WhatsApp — número (sin +)" value={howToBuy.whatsappNumber} onChange={(v) => setHowToBuy((h) => ({ ...h, whatsappNumber: v }))} />
              <Field label="WhatsApp — mensaje prearmado" value={howToBuy.whatsappMessage} onChange={(v) => setHowToBuy((h) => ({ ...h, whatsappMessage: v }))} />
            </div>
          </section>

          {/* ── Banner promocional ── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Banner promocional</h2>
              <p className="text-sm text-gray-500">
                Para anunciar un evento o colaboración (ej. una campaña con otra marca). Se muestra debajo del hero solo si está activado.
              </p>
            </div>
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 space-y-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={banner.enabled}
                  onChange={(e) => setBanner((b) => ({ ...b, enabled: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Mostrar el banner en la home
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Eyebrow (texto chico arriba)" value={banner.eyebrow} onChange={(v) => setBanner((b) => ({ ...b, eyebrow: v }))} />
                <div />
                <Field label="Título" value={banner.title} onChange={(v) => setBanner((b) => ({ ...b, title: v }))} />
                <Field label="Subtítulo" value={banner.subtitle} onChange={(v) => setBanner((b) => ({ ...b, subtitle: v }))} />
                <Field label="Texto del botón" value={banner.ctaLabel} onChange={(v) => setBanner((b) => ({ ...b, ctaLabel: v }))} />
                <Field label="Link del botón" value={banner.ctaHref} onChange={(v) => setBanner((b) => ({ ...b, ctaHref: v }))} />
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex items-center gap-3 sticky bottom-0 bg-white/90 backdrop-blur py-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-black uppercase tracking-tight text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
      />
    </div>
  );
}
