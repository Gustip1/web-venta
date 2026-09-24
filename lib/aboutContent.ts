/**
 * Textos editables de la página /nosotros.
 *
 * Se cargan desde /admin/ajustes → pestaña "Nosotros" y se guardan en la
 * tabla settings (key "about_page"). Vive fuera de los componentes para que
 * lo puedan importar tanto el server component de la página como el panel.
 */

export const ABOUT_CONTENT_KEY = 'about_page';

/** Los íconos disponibles para las tarjetas de "Cómo trabajamos". */
export const ABOUT_ICONS = ['escudo', 'camion', 'estrella', 'gente'] as const;
export type AboutIcon = (typeof ABOUT_ICONS)[number];

export const ABOUT_ICON_LABELS: Record<AboutIcon, string> = {
  escudo: '🛡️ Escudo',
  camion: '🚚 Camión',
  estrella: '✨ Estrella',
  gente: '👥 Gente',
};

export interface AboutValue {
  icon: AboutIcon;
  title: string;
  desc: string;
}

export interface AboutStat {
  /** El número grande, ej. "100%". */
  value: string;
  /** La palabra debajo, ej. "Original". */
  label: string;
  /** La aclaración chica, ej. "Sin réplicas". */
  hint: string;
}

export interface AboutContent {
  heroTitle: string;
  heroTitleHighlight: string;
  valuesTitle: string;
  valuesSubtitle: string;
  values: AboutValue[];
  storyEyebrow: string;
  storyTitle: string;
  /** Un párrafo por línea. */
  storyText: string;
  /** Un ítem por línea. */
  storyBullets: string;
  stats: AboutStat[];
}

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  heroTitle: 'Cultura urbana,',
  heroTitleHighlight: 'producto original.',
  valuesTitle: 'Cómo trabajamos',
  valuesSubtitle: 'Cuatro cosas que no negociamos.',
  values: [
    { icon: 'escudo', title: 'Producto original', desc: 'Cada pieza se revisa antes de salir. Sin réplicas, sin excepciones.' },
    { icon: 'camion', title: 'Envíos a todo el país', desc: 'Coordinamos la entrega con seguimiento hasta tu puerta.' },
    { icon: 'estrella', title: 'Curaduría propia', desc: 'Elegimos modelo por modelo: sólo entra lo que vale la pena.' },
    { icon: 'gente', title: 'Atención de verdad', desc: 'Te contestamos nosotros, no un bot. Antes, durante y después de la compra.' },
  ],
  storyEyebrow: 'Nuestra historia',
  storyTitle: 'Por qué arrancamos',
  storyText: [
    'Contá acá cómo empezó la tienda: qué te faltaba en tu ciudad, qué querías hacer distinto y cómo fue el primer pedido. Las historias reales venden más que cualquier eslogan.',
    'Sumá un segundo párrafo con dónde están hoy: cuántos clientes, qué marcas trabajan y qué se viene.',
  ].join('\n'),
  storyBullets: [
    'Productos verificados uno por uno',
    'Precio claro, sin sorpresas',
    'Posventa que responde',
  ].join('\n'),
  stats: [
    { value: '100%', label: 'Original', hint: 'Sin réplicas' },
    { value: '24h', label: 'Respuesta', hint: 'Todos los días' },
    { value: 'País', label: 'Envíos', hint: 'Con seguimiento' },
    { value: '★', label: 'Clientes', hint: 'Que vuelven' },
  ],
};

/** Completa lo que falte con los valores por defecto (configs viejas o a medias). */
export function mergeAboutContent(value: unknown): AboutContent {
  const v = (value ?? {}) as Partial<AboutContent>;
  return {
    ...DEFAULT_ABOUT_CONTENT,
    ...v,
    values: Array.isArray(v.values) && v.values.length > 0 ? v.values : DEFAULT_ABOUT_CONTENT.values,
    stats: Array.isArray(v.stats) && v.stats.length > 0 ? v.stats : DEFAULT_ABOUT_CONTENT.stats,
  };
}

/** Parte un textarea en líneas limpias (sin vacías). */
export function toLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}
