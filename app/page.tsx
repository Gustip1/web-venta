import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/db';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { CategoryTile, CategoryTileConfig, resolveVisibleTiles } from '@/lib/categories';
import { NewArrivalsCarousel } from '@/components/landing/NewArrivalsCarousel';
import { HomepageBrands } from '@/components/landing/HomepageBrands';
import { Reviews, Review } from '@/components/landing/Reviews';
import { HowToBuy } from '@/components/landing/HowToBuy';
import { InstagramFeed } from '@/components/landing/InstagramFeed';
import { PromoBanner } from '@/components/promo/PromoBanner';
import {
  HomeBrandEntry,
  DEFAULT_HOME_BRAND_ENTRIES,
  HeroContent,
  DEFAULT_HERO_CONTENT,
  HowToBuyContent,
  DEFAULT_HOW_TO_BUY_CONTENT,
  PromoBannerContent,
  DEFAULT_PROMO_BANNER_CONTENT,
} from '@/lib/homeContent';

// ISR: la home se sirve estática y se refresca cada 5 minutos,
// así los nuevos ingresos aparecen en el primer render (sin skeletons).
export const revalidate = 300;

const SETTINGS_KEYS = [
  'homepage_hero',
  'homepage_how_to_buy',
  'homepage_banner',
  'homepage_categories',
  'homepage_brands',
  'homepage_reviews',
] as const;

interface HomeContent {
  hero: HeroContent;
  howToBuy: HowToBuyContent;
  banner: PromoBannerContent;
  categoryImages: Record<string, string>;
  categoryTiles: CategoryTile[];
  brandEntries: HomeBrandEntry[];
  reviews: Review[];
}

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Resuelve las imágenes de categorías: primero lo configurado a mano desde
 * /admin/portada, y para las que falten, la última foto de producto de esa
 * subcategoría. Antes esto vivía en CategoryShowcase (client, 1-4 requests
 * propios); ahora es una sola pasada server-side.
 */
async function resolveCategoryImages(
  supabase: ReturnType<typeof supabaseAnon>,
  configuredCats: CategoryTileConfig[] | undefined,
  tiles: CategoryTile[]
): Promise<Record<string, string>> {
  const configured: Record<string, string> = {};
  if (Array.isArray(configuredCats)) {
    configuredCats.forEach((t) => {
      if (t?.sub && t?.url) configured[t.sub] = t.url;
    });
  }

  const missing = tiles.filter((c) => !configured[c.sub]);
  if (missing.length === 0) return configured;

  const fallbacks = await Promise.all(
    missing.map((c) => {
      // "sneakers" es una categoría propia, no una subcategoría de streetwear
      const query = supabase.from('products').select('images').eq('active', true);
      return (c.sub === 'sneakers' ? query.eq('category', 'sneakers') : query.eq('subcategory', c.sub))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    })
  );

  const map = { ...configured };
  fallbacks.forEach((res, i) => {
    const imgs = (res.data as any)?.images as { url: string }[] | undefined;
    if (imgs?.length) map[missing[i].sub] = imgs[imgs.length - 1].url;
  });
  return map;
}

/**
 * Trae los productos de TODOS los carruseles de marca en, como mucho, dos
 * queries (una para todas las marcas vía `.in()`, otra para "sneakers" por
 * categoría) en vez de una request por carrusel — antes eran 5 requests
 * client-side independientes (una por BrandShowcase montado).
 */
async function getHomeBrandProducts(
  supabase: ReturnType<typeof supabaseAnon>,
  entries: HomeBrandEntry[]
): Promise<Record<string, Product[]>> {
  const PER_ENTRY_LIMIT = 10;
  const brandEntries = entries.filter((e) => e.kind === 'brand' && e.slug);
  const sneakersEntry = entries.find((e) => e.kind === 'sneakers');

  const [brandRes, sneakersRes] = await Promise.all([
    brandEntries.length > 0
      ? supabase
          .from('products')
          .select('*, product_variants(stock,size)')
          .eq('active', true)
          .in('brand', brandEntries.map((e) => e.slug!))
          .order('created_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as unknown[] }),
    sneakersEntry
      ? supabase
          .from('products')
          .select('*, product_variants(stock,size)')
          .eq('active', true)
          .eq('category', 'sneakers')
          .order('created_at', { ascending: false })
          .limit(PER_ENTRY_LIMIT)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const allBrandProducts = (brandRes.data ?? []) as unknown as Product[];
  const byEntry: Record<string, Product[]> = {};

  for (const e of brandEntries) {
    byEntry[e.id] = allBrandProducts.filter((p: any) => p.brand === e.slug).slice(0, PER_ENTRY_LIMIT);
  }

  if (sneakersEntry) {
    byEntry[sneakersEntry.id] = (sneakersRes.data ?? []) as unknown as Product[];
  }

  return byEntry;
}

async function getHomeContent(): Promise<HomeContent> {
  const supabase = supabaseAnon();

  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', SETTINGS_KEYS);

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  const rawBrandEntries = byKey.get('homepage_brands') as HomeBrandEntry[] | undefined;
  const brandEntries = Array.isArray(rawBrandEntries) && rawBrandEntries.length > 0
    ? rawBrandEntries
    : DEFAULT_HOME_BRAND_ENTRIES;

  const rawReviews = byKey.get('homepage_reviews') as Review[] | undefined;

  const categoryConfig = byKey.get('homepage_categories') as CategoryTileConfig[] | undefined;
  const categoryTiles = resolveVisibleTiles(categoryConfig);
  const categoryImages = await resolveCategoryImages(supabase, categoryConfig, categoryTiles);

  return {
    hero: { ...DEFAULT_HERO_CONTENT, ...(byKey.get('homepage_hero') as Partial<HeroContent> | undefined) },
    howToBuy: { ...DEFAULT_HOW_TO_BUY_CONTENT, ...(byKey.get('homepage_how_to_buy') as Partial<HowToBuyContent> | undefined) },
    banner: { ...DEFAULT_PROMO_BANNER_CONTENT, ...(byKey.get('homepage_banner') as Partial<PromoBannerContent> | undefined) },
    categoryImages,
    categoryTiles,
    brandEntries,
    reviews: Array.isArray(rawReviews) ? rawReviews : [],
  };
}

async function getHomeProducts(): Promise<{ products: Product[]; curated: boolean }> {
  // Cliente anónimo sin cookies: mantiene la página estática (ISR)
  const supabase = supabaseAnon();

  const { data: newArrivals } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (newArrivals && newArrivals.length > 0) {
    return { products: newArrivals as unknown as Product[], curated: true };
  }

  // Fallback: si no hay productos marcados como "nuevo ingreso" en el admin
  // (o la query falló), la home muestra igual lo último del catálogo.
  const { data: latest } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(12);

  return { products: (latest ?? []) as unknown as Product[], curated: false };
}

export default async function HomePage() {
  const [{ products, curated }, content] = await Promise.all([
    getHomeProducts(),
    getHomeContent(),
  ]);

  const brandProducts = await getHomeBrandProducts(supabaseAnon(), content.brandEntries);

  return (
    <div className="bg-white">
      {/* Hero — solo texto + CTAs */}
      <HeroSection content={content.hero} />

      {/* Banner promocional — solo se muestra si está habilitado desde /admin/portada */}
      <PromoBanner content={content.banner} />

      {/* Elegí tu estilo — remeras / hoodies / pantalones */}
      <CategoryShowcase images={content.categoryImages} tiles={content.categoryTiles} />

      {/* Nuevos ingresos en carrusel — server-rendered */}
      <NewArrivalsCarousel products={products} curated={curated} />

      {/* Opiniones de clientes — antes estaban al 74% de la página, donde según
          las analíticas casi nadie llegaba (la mitad baja hasta el 27%). Subirlas
          acá les da aire y corta la fila de carruseles casi idénticos, que era
          lo que hacía abandonar antes de llegar al fondo. */}
      <Reviews reviews={content.reviews} />

      {/* Carruseles por marca — configurables desde /admin/portada */}
      <HomepageBrands entries={content.brandEntries} productsByEntry={brandProducts} />

      {/* Feed de Instagram — se oculta solo si no hay token cargado */}
      <InstagramFeed />

      {/* Cómo comprar — último bloque antes del footer */}
      <HowToBuy content={content.howToBuy} />
    </div>
  );
}
