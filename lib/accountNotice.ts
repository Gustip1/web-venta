/**
 * Aviso emergente: un cartel que aparece al entrar a la tienda y que el
 * visitante tiene que aceptar para seguir. Sirve para comunicar algo
 * importante y puntual (una demora, un cambio de cuenta, vacaciones).
 *
 * Se prende, se apaga y se escribe desde /admin/ajustes → pestaña Aviso.
 * Vive en la tabla `settings` (key = 'account_notice').
 */

export const ACCOUNT_NOTICE_SETTING_KEY = 'account_notice';

/** Se recuerda por pestaña: aceptado una vez, no vuelve a molestar en esa visita. */
export const ACCOUNT_NOTICE_ACK_KEY = 'store_notice_ack';

export interface AccountNotice {
  active: boolean;
  /** Etiqueta chica arriba del título. */
  badge: string;
  title: string;
  /** Texto principal. Se respetan los saltos de línea. */
  message: string;
  /** Frase destacada opcional, en cursiva y con barra de color. */
  aside: string;
  /** Botón secundario opcional (por ejemplo, un link a una red). */
  ctaLabel: string;
  ctaUrl: string;
  /** Texto del botón que cierra el aviso. */
  accept: string;
  /** Firma opcional al pie. */
  signature: string;
}

export const DEFAULT_ACCOUNT_NOTICE: AccountNotice = {
  active: false,
  badge: '👋 Te queremos contar algo',
  title: 'Un aviso importante',
  message:
    'Escribí acá lo que necesites comunicarle a quien entra a la tienda. ' +
    'Este cartel se muestra una vez por visita y hay que aceptarlo para seguir navegando.',
  aside: '',
  ctaLabel: '',
  ctaUrl: '',
  accept: 'Entendido 👍',
  signature: '',
};

export function mergeAccountNotice(value: unknown): AccountNotice {
  const v = (value ?? {}) as Partial<AccountNotice>;
  return { ...DEFAULT_ACCOUNT_NOTICE, ...v };
}
