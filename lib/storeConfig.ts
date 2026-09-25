/**
 * Configuración de la tienda — todo lo que el dueño puede cambiar desde
 * /admin/ajustes sin tocar una línea de código: nombre, logo, colores,
 * contacto, redes, datos de cobro y SEO.
 *
 * Se guarda como un único registro en la tabla `settings`
 * (key = 'store_config', value = este JSON).
 */

export const STORE_CONFIG_KEY = 'store_config';

export interface StoreColors {
  /** Color principal: botones, links, acentos. */
  primary: string;
  /** Variante más oscura para hover. */
  primaryHover: string;
  /** Variante muy clara para fondos suaves. */
  primaryLight: string;
  /** Color secundario para detalles. */
  accent: string;
}

export interface StoreConfig {
  name: string;
  tagline: string;
  /** Párrafo de presentación que se muestra en el pie del sitio. */
  about: string;
  /** URL del logo subido por el dueño. Si es null se escribe el nombre de la tienda. */
  logoUrl: string | null;
  colors: StoreColors;
  contact: {
    /** Sólo números, con código de país. Ej: 5491122334455 */
    whatsapp: string;
    email: string;
    city: string;
    address: string;
  };
  social: {
    instagram: string;
    tiktok: string;
    facebook: string;
  };
  payment: {
    /** Alias o CBU en moneda local. */
    aliasArs: string;
    /** Alias de la cuenta en dólares (opcional). */
    aliasUsd: string;
    /** Nombre del titular de la cuenta, para que el cliente verifique. */
    holder: string;
    /** Wallet para cobros en cripto (opcional). */
    cryptoWallet: string;
  };
  shipping: {
    /**
     * Cuánto cobra el envío a domicilio, en moneda local (no en dólares:
     * el envío se cotiza en pesos, no sigue al precio de los productos).
     * 0 = no se cobra un monto fijo y se muestra `note` en su lugar.
     */
    cost: number;
    /** Qué se muestra cuando no hay monto fijo. Ej: "A coordinar por WhatsApp". */
    note: string;
  };
  /** Los mensajes que van pasando en la cinta negra de arriba de todo. */
  bannerMessages: string[];
  /**
   * El emoji de cada categoría, por su valor ('sneakers', 'remeras', …).
   * Lo que no esté acá usa el emoji que trae la categoría por defecto.
   */
  categoryIcons: Record<string, string>;
  seo: {
    title: string;
    description: string;
    /** Dominio final, sin barra al final. Ej: https://mitienda.com */
    siteUrl: string;
    /** ID del pixel de Meta. Vacío = no se carga el script. */
    metaPixelId: string;
  };
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  name: 'Mi Tienda',
  tagline: 'Sneakers & Streetwear',
  about: 'Contá acá en pocas líneas qué hace especial a tu tienda. Se muestra en el pie de la página.',
  logoUrl: null,
  colors: {
    primary: '#008060',
    primaryHover: '#006e52',
    primaryLight: '#e6f4f1',
    accent: '#5c6ac4',
  },
  contact: { whatsapp: '', email: '', city: '', address: '' },
  social: { instagram: '', tiktok: '', facebook: '' },
  payment: { aliasArs: '', aliasUsd: '', holder: '', cryptoWallet: '' },
  shipping: { cost: 0, note: 'A coordinar' },
  bannerMessages: [
    '✓ Productos 100% originales',
    '📦 Envíos a todo el país',
    '✨ Productos únicos y exclusivos',
  ],
  categoryIcons: {},
  seo: { title: '', description: '', siteUrl: '', metaPixelId: '' },
};

/** Completa los huecos de una config parcial venida de la base. */
export function mergeStoreConfig(value: unknown): StoreConfig {
  const v = (value ?? {}) as Partial<StoreConfig>;
  return {
    ...DEFAULT_STORE_CONFIG,
    ...v,
    colors: { ...DEFAULT_STORE_CONFIG.colors, ...(v.colors ?? {}) },
    contact: { ...DEFAULT_STORE_CONFIG.contact, ...(v.contact ?? {}) },
    social: { ...DEFAULT_STORE_CONFIG.social, ...(v.social ?? {}) },
    payment: { ...DEFAULT_STORE_CONFIG.payment, ...(v.payment ?? {}) },
    shipping: { ...DEFAULT_STORE_CONFIG.shipping, ...(v.shipping ?? {}) },
    bannerMessages:
      Array.isArray(v.bannerMessages) && v.bannerMessages.length > 0
        ? v.bannerMessages
        : DEFAULT_STORE_CONFIG.bannerMessages,
    categoryIcons: { ...DEFAULT_STORE_CONFIG.categoryIcons, ...(v.categoryIcons ?? {}) },
    seo: { ...DEFAULT_STORE_CONFIG.seo, ...(v.seo ?? {}) },
  };
}

/** Link de WhatsApp listo para usar, o null si el dueño no cargó el número. */
export function whatsappUrl(config: StoreConfig, message?: string): string | null {
  const phone = config.contact.whatsapp.replace(/\D/g, '');
  if (!phone) return null;
  const base = `https://api.whatsapp.com/send?phone=${phone}`;
  return message ? `${base}&text=${encodeURIComponent(message)}` : base;
}

/**
 * Saca el @usuario de una URL de red social para mostrarlo lindo.
 * Si la URL está vacía o no se puede leer, devuelve null.
 */
export function socialHandle(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const last = path.split('/').filter(Boolean).pop();
    if (!last) return null;
    return last.startsWith('@') ? last : `@${last}`;
  } catch {
    const raw = url.trim().replace(/^@/, '');
    return raw ? `@${raw}` : null;
  }
}

/** Las variables CSS que pinta el layout para que los colores se apliquen a todo el sitio. */
export function colorCssVars(colors: StoreColors): string {
  return [
    `--color-primary:${colors.primary}`,
    `--color-primary-hover:${colors.primaryHover}`,
    `--color-primary-light:${colors.primaryLight}`,
    `--color-accent:${colors.accent}`,
  ].join(';');
}
