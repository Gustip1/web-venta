import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Instagram,
  MapPin,
  Shield,
  Sparkles,
  Truck,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { getInstagramPosts } from '@/lib/instagram';
import { getAboutContent, getStoreConfig } from '@/lib/storeConfig.server';
import { AboutIcon, toLines } from '@/lib/aboutContent';
import { whatsappUrl, socialHandle } from '@/lib/storeConfig';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  return {
    title: `Nosotros | ${config.name}`,
    description: config.about,
  };
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
    </svg>
  );
}

/** Los íconos que ofrece el panel, en el orden de lib/aboutContent. */
const ICONS: Record<AboutIcon, typeof Shield> = {
  escudo: Shield,
  camion: Truck,
  estrella: Sparkles,
  gente: Users,
};

/**
 * Página "Nosotros". Los datos (nombre, ciudad, redes, WhatsApp)
 * salen de /admin/ajustes; los textos largos están acá para que cada tienda
 * los reescriba con su propia historia.
 */
export default async function NosotrosPage() {
  const config = await getStoreConfig();
  const about = await getAboutContent();
  const feed = await getInstagramPosts(9);
  const wa = whatsappUrl(config, `Hola! Quería hacerles una consulta.`);
  const igHandle = socialHandle(config.social.instagram);
  const ttHandle = socialHandle(config.social.tiktok);

  const valores = about.values.map((v) => ({ ...v, icon: ICONS[v.icon] ?? Shield }));

  return (
    <div className="bg-white text-gray-900 -mx-2 md:-mx-8 lg:-mx-12 -my-3 md:-my-8 overflow-hidden">
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-32 h-[420px] w-[420px] rounded-full bg-gray-300/30 blur-[120px] animate-pulse-slow" />
          <div className="absolute top-40 -right-24 h-[380px] w-[380px] rounded-full bg-gray-200/30 blur-[120px] animate-pulse-slow animation-delay-2000" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 pt-16 md:pt-28 pb-14 md:pb-20">
          <div className="animate-hero-enter inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-6 md:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-900" />
            </span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.18em] text-gray-700">
              Nosotros · {config.name}
            </span>
          </div>

          <h1 className="animate-hero-enter hero-delay-1 text-[2.5rem] leading-[0.95] md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl text-gray-900">
            {about.heroTitle}
            <br />
            <span className="text-gray-400">{about.heroTitleHighlight}</span>
          </h1>

          <p className="animate-hero-enter hero-delay-2 mt-6 md:mt-8 max-w-2xl text-base md:text-xl text-gray-600 font-medium leading-relaxed">
            {config.about}
          </p>

          <div className="animate-hero-enter hero-delay-3 mt-8 md:mt-10 flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white transition-transform hover:bg-black active:scale-95"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-900 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
              >
                Escribinos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────── VALORES ───────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-14 md:py-20">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900">
            {about.valuesTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-gray-600 font-medium">
            {about.valuesSubtitle}
          </p>

          <div className="mt-8 md:mt-12 grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valores.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 transition-shadow hover:shadow-medium"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-base md:text-lg font-black text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── HISTORIA ───────────────────────── */}
      <section className="border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-14 md:py-20 grid gap-10 md:gap-16 lg:grid-cols-2">
          <div>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.18em] text-gray-400">
              {about.storyEyebrow}
            </p>
            <h2 className="mt-3 text-2xl md:text-4xl font-black tracking-tight text-gray-900">
              {about.storyTitle}
            </h2>
            <div className="mt-5 space-y-4 text-sm md:text-base text-gray-600 font-medium leading-relaxed">
              {toLines(about.storyText).map((parrafo) => (
                <p key={parrafo}>{parrafo}</p>
              ))}
            </div>

            <ul className="mt-6 space-y-2.5">
              {toLines(about.storyBullets).map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm font-bold text-gray-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-900" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 content-start">
            {about.stats.map(({ value: k, label: v, hint: sub }) => (
              <div key={v} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-6">
                <p className="text-2xl md:text-4xl font-black tracking-tighter text-gray-900">{k}</p>
                <p className="mt-1 text-sm font-black uppercase tracking-tight text-gray-900">{v}</p>
                <p className="text-xs font-bold text-gray-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── REDES ───────────────────────── */}
      {(config.social.instagram || config.social.tiktok || config.contact.city) && (
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-14 md:py-20">
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900">Seguinos</h2>

            <div className="mt-8 flex flex-wrap gap-3">
              {config.social.instagram && (
                <a
                  href={config.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-900 transition-colors hover:border-gray-400"
                >
                  <Instagram className="h-4 w-4" /> {igHandle}
                </a>
              )}
              {config.social.tiktok && (
                <a
                  href={config.social.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-900 transition-colors hover:border-gray-400"
                >
                  <TikTokIcon className="h-4 w-4" /> {ttHandle}
                </a>
              )}
              {config.contact.city && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-900">
                  <MapPin className="h-4 w-4" /> {config.contact.city}
                </span>
              )}
            </div>

            {/* Feed de Instagram — aparece al conectar el token en /admin/ajustes */}
            {feed.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-2 md:gap-3">
                {feed.map((post) => (
                  <a
                    key={post.id}
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt={post.caption?.slice(0, 80) || 'Post de Instagram'}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
