/**
 * Promoción "3 cuotas sin interés".
 *
 * Se activa/desactiva desde /admin/ajustes (tabla settings, key
 * "installments_promo"). Ver components/InstallmentsPromoProvider para
 * cómo se obtiene el valor en vivo en toda la web.
 */

export const PROMO_TEXT =
  '3 cuotas sin interés al mismo precio que efectivo y transferencia, sin recargo.';

/** Recargo (porcentaje) para pago en 3 cuotas con tarjeta. Con la promo activa: 0. */
export function getCardSurchargeRate(promoActive: boolean): number {
  return promoActive ? 0 : 0.1;
}

/** Multiplicador a aplicar al precio base para obtener el precio en 3 cuotas. */
export function getCardPriceMultiplier(promoActive: boolean): number {
  return 1 + getCardSurchargeRate(promoActive);
}
