/**
 * Tipos y valores por defecto del contenido editable del home (hero, cómo comprar,
 * social proof, banner promocional). Vive fuera de los componentes "use client"
 * para poder importarse tanto desde el server component (app/page.tsx) como
 * desde las páginas de admin sin cruzar el boundary cliente/servidor de RSC.
 */

export interface HeroContent {
  badge: string;
  headlinePre: string;
  headlineHighlight: string;
  headlinePost: string;
  subtitlePre: string;
  subtitleBold: string;
  subtitlePost: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  trustPill1: string;
  trustPill2: string;
}

export const DEFAULT_HERO_CONTENT: HeroContent = {
  badge: 'Stock exclusivo',
  headlinePre: 'Sneakers ',
  headlineHighlight: '& Streetwear',
  headlinePost: ' originales.',
  subtitlePre: 'Selección curada de lo que está de moda. ',
  subtitleBold: '100% originales',
  subtitlePost: ', envíos a todo el país.',
  ctaPrimaryLabel: 'Ver catálogo',
  ctaPrimaryHref: '/productos',
  ctaSecondaryLabel: 'Ofertas',
  ctaSecondaryHref: '/ofertas',
  trustPill1: 'Originales garantizados',
  trustPill2: 'Envíos a todo el país',
};

export interface HowToBuyStep {
  title: string;
  desc: string;
  icon: string;
}

export interface HowToBuyContent {
  steps: HowToBuyStep[];
  whatsappNumber: string;
  whatsappMessage: string;
}

export const DEFAULT_HOW_TO_BUY_CONTENT: HowToBuyContent = {
  steps: [
    {
      title: 'Elegís tu producto',
      desc: 'Navegá el catálogo, seleccioná el modelo y la talla que querés.',
      icon: '👟',
    },
    {
      title: 'Pagás con el método que prefieras',
      desc: 'Transferencia, efectivo o 3 cuotas sin interés con tarjeta.',
      icon: '💳',
    },
    {
      title: 'Lo recibís en tu puerta',
      desc: 'Enviamos a todo el país. También podés coordinar retiro.',
      icon: '📦',
    },
  ],
  whatsappNumber: '',
  whatsappMessage: 'Hola, tengo una consulta sobre un producto',
};

export interface PromoBannerContent {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export const DEFAULT_PROMO_BANNER_CONTENT: PromoBannerContent = {
  enabled: false,
  eyebrow: 'Próximo evento',
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaHref: '',
};

/**
 * Qué hace la tienda con el pago en 3 cuotas:
 *   'on'   → se ofrece normalmente
 *   'soon' → se anuncia como "próximamente", sin precio ni opción de pago
 *   'off'  → no se menciona en ningún lado (cinta, catálogo, producto, checkout)
 */
export type InstallmentsMode = 'on' | 'soon' | 'off';

export interface InstallmentsPromoContent {
  /** Si está activo, las 3 cuotas no tienen recargo (y se muestra el popup en todo el sitio). */
  active: boolean;
  mode: InstallmentsMode;
  /** Texto del cartel mientras está en "próximamente". */
  soonLabel: string;
}

export const DEFAULT_INSTALLMENTS_PROMO_CONTENT: InstallmentsPromoContent = {
  active: false,
  // 'on' para que las tiendas que ya venían ofreciendo cuotas no las pierdan
  // al actualizar: las filas viejas de settings sólo tienen `active`.
  mode: 'on',
  soonLabel: 'Cuotas próximamente',
};


/* ────────────── Carruseles de marca de la home ────────────── */

export type HomeBrandEntry = {
  id: string;
  kind: 'brand' | 'sneakers';
  slug?: string;
  title: string;
  eyebrow?: string;
};

/**
 * Qué carruseles muestra la home mientras nadie haya elegido nada en
 * /admin/portada. Se arranca sólo con el de sneakers, que no depende de
 * ninguna marca cargada: al agregar marcas desde el panel aparecen acá.
 *
 * Vive en este módulo (y no junto al componente) porque app/page.tsx lo usa
 * en el servidor: importar datos desde un módulo "use client" los convierte
 * en referencias remotas y cualquier .filter() sobre ellos rompe el build.
 */
export const DEFAULT_HOME_BRAND_ENTRIES: HomeBrandEntry[] = [
  { id: 'sneakers', kind: 'sneakers', title: 'Sneakers', eyebrow: 'Calzado' },
];
