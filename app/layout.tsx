import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { RouteTransitions } from '@/components/RouteTransitions';
import { DolarRateProvider } from '@/components/DolarRateProvider';
import { InstallmentsPromoProvider } from '@/components/InstallmentsPromoProvider';
import { ComingSoonProvider } from '@/components/ComingSoonProvider';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { PromoModal } from '@/components/promo/PromoModal';
import { AccountNoticeProvider } from '@/components/announcement/AccountNoticeProvider';
import { AccountNoticeModal } from '@/components/announcement/AccountNoticeModal';
import { RecentSaleToast } from '@/components/ui/RecentSaleToast';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { HideOnAdmin } from '@/components/layout/HideOnAdmin';
import { StoreConfigProvider } from '@/components/StoreConfigProvider';
import { getStoreConfig } from '@/lib/storeConfig.server';
import { colorCssVars } from '@/lib/storeConfig';

// Auto-hospedadas por Next (sin @import ni round-trip a fonts.googleapis.com,
// que antes bloqueaba el render ~500-600ms en cada carga).
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export async function generateViewport(): Promise<Viewport> {
  const config = await getStoreConfig();
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: config.colors.primary,
  };
}

/** Título, descripción y dominio salen de /admin/ajustes → pestaña SEO. */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  const title = config.seo.title || `${config.name} — ${config.tagline}`;
  const description = config.seo.description || config.tagline;

  return {
    title,
    description,
    metadataBase: config.seo.siteUrl ? new URL(config.seo.siteUrl) : undefined,
    openGraph: { title, description, type: 'website', locale: 'es_AR' },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getStoreConfig();

  return (
    <html lang="es" suppressHydrationWarning className={cn(dmSans.variable, playfairDisplay.variable)}>
      <body className={cn('min-h-screen bg-white text-gray-900 antialiased font-sans font-medium')}>
        {/* Colores elegidos en /admin/ajustes. Van acá y no en globals.css para
            que el primer render ya salga con la paleta del dueño, sin parpadeo. */}
        <style dangerouslySetInnerHTML={{ __html: `:root{${colorCssVars(config.colors)}}` }} />

        {/* Meta Pixel — se carga sólo si se cargó un ID en /admin/ajustes → SEO */}
        {config.seo.metaPixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${config.seo.metaPixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img height="1" width="1" style={{ display: 'none' }} alt=""
                src={`https://www.facebook.com/tr?id=${config.seo.metaPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
        
        <StoreConfigProvider config={config}>
        <DolarRateProvider>
          <AccountNoticeProvider>
          <InstallmentsPromoProvider>
            <ComingSoonProvider>
            <AnalyticsProvider>
              <Header />
              <Sidebar />
              <main className="px-2 py-3 md:px-8 md:py-8 lg:px-12 max-w-[1600px] mx-auto bg-white overflow-x-hidden">
                <RouteTransitions>{children}</RouteTransitions>
              </main>
              <HideOnAdmin>
                <Footer />
                <CartDrawer />
                <AccountNoticeModal />
                <PromoModal />
                <RecentSaleToast />
              </HideOnAdmin>
              <WhatsAppFab />
            </AnalyticsProvider>
            </ComingSoonProvider>
          </InstallmentsPromoProvider>
          </AccountNoticeProvider>
        </DolarRateProvider>
        </StoreConfigProvider>
      </body>
    </html>
  );
}
