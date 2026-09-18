"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart';
import { useCheckoutStore, PaymentMethod } from '@/store/checkout';
import { formatCurrency } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { useInstallmentsPromo } from '@/components/InstallmentsPromoProvider';
import { getCardSurchargeRate } from '@/lib/promo';
import { trackEvent } from '@/lib/analytics/track';
import {
  MapPin,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Bitcoin,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Clock,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useStoreConfig } from '@/components/StoreConfigProvider';
import { whatsappUrl } from '@/lib/storeConfig';

type Step = 1 | 2;


export default function CheckoutPage() {
  const storeConfig = useStoreConfig();
  const router = useRouter();
  const supabase = createBrowserClient();
  const cart = useCartStore();
  const checkout = useCheckoutStore();
  const { rate: dolarOficial } = useDolarRate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState<string | null>(null);
  const [completedProofUploaded, setCompletedProofUploaded] = useState(false);

  // Check cart expiry
  useEffect(() => {
    const interval = setInterval(() => {
      if (cart.checkExpiry()) {
        router.push('/productos');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cart, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0 && !orderComplete) {
      router.push('/productos');
    }
  }, [cart.items.length, orderComplete, router]);

  // Track: llegó al checkout con productos (una vez por visita a la página)
  const checkoutTrackedRef = useRef(false);
  useEffect(() => {
    if (cart.items.length > 0 && !checkoutTrackedRef.current) {
      checkoutTrackedRef.current = true;
      trackEvent('checkout_started', 'ecommerce', {
        items: cart.items.length,
        units: cart.items.reduce((acc, it) => acc + it.quantity, 0),
      });
    }
  }, [cart.items]);

  const subtotalUSD = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [cart.items]
  );
  // Recargo en tarjeta: 10% normal, 0% cuando el admin activa la promo en /admin/ajustes.
  const isCardPayment = checkout.paymentMethod === 'installments_3';
  const { active: promoOn } = useInstallmentsPromo();
  const surchargeRate = getCardSurchargeRate(promoOn);

  // ─── Cupón de descuento ───
  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const discountAmount = Math.min(checkout.appliedDiscount?.amount ?? 0, subtotalUSD);
  const discountedSubtotalUSD = subtotalUSD - discountAmount;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: subtotalUSD }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'No se pudo validar el cupón');
        checkout.setAppliedDiscount(null);
        return;
      }
      checkout.setAppliedDiscount({
        code: code.toUpperCase(),
        type: data.type,
        value: data.value,
        amount: data.discountAmount,
      });
    } catch {
      setCouponError('Error de conexión. Intentá de nuevo.');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    checkout.setAppliedDiscount(null);
    setCouponInput('');
    setCouponError(null);
  };

  const totalUSD = isCardPayment ? discountedSubtotalUSD * (1 + surchargeRate) : discountedSubtotalUSD;
  const totalARS = totalUSD * dolarOficial;

  // ─── Step 1 Validation ───
  const validateStep1 = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (checkout.fulfillment === 'shipping') {
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.lastName.trim()) e.lastName = 'Apellido requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
      if (!checkout.contact.phone.trim()) e.phone = 'Teléfono requerido';
      if (!checkout.address.street.trim()) e.street = 'Dirección requerida';
      if (!checkout.address.postalCode.trim()) e.postalCode = 'Código postal requerido';
      if (!checkout.address.city.trim()) e.city = 'Localidad requerida';
      if (!checkout.address.province.trim()) e.province = 'Provincia requerida';
      if (!checkout.contact.document.trim()) e.document = 'DNI requerido';
    } else {
      // Pickup: todos los datos personales
      if (!checkout.contact.firstName.trim()) e.firstName = 'Nombre requerido';
      if (!checkout.contact.lastName.trim()) e.lastName = 'Apellido requerido';
      if (!checkout.contact.email.trim()) e.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.contact.email)) e.email = 'Email inválido';
      if (!checkout.contact.phone.trim()) e.phone = 'Teléfono requerido';
      if (!checkout.contact.document.trim()) e.document = 'DNI requerido';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [checkout]);

  const handleContinueToPayment = () => {
    if (validateStep1()) setStep(2);
  };

  // ─── Submit Order ───
  const handleSubmitOrder = async () => {
    if (!checkout.paymentMethod) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((it) => ({
            productId: it.productId,
            title: it.title,
            slug: it.slug,
            price: it.price,
            size: it.size,
            quantity: it.quantity,
          })),
          fulfillment: checkout.fulfillment,
          paymentMethod: checkout.paymentMethod,
          contact: checkout.contact,
          address: checkout.fulfillment === 'shipping' ? checkout.address : null,
          couponCode: checkout.appliedDiscount?.code ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error || 'Error al procesar la orden' });
        setSubmitting(false);
        return;
      }

      const orderId = data.orderId;
      checkout.setOrderId(orderId);

      trackEvent('purchase', 'ecommerce', {
        order: data.orderNumber || orderId.slice(0, 8),
        total_usd: totalUSD,
        method: checkout.paymentMethod,
      });

      // Upload proof if provided (optional) — swallow errors so order success always shows
      if (checkout.paymentMethod === 'crypto_transfer' && proofFile) {
        const fd = new FormData();
        fd.append('file', proofFile);
        fd.append('order_id', orderId);
        await fetch('/api/upload-proof', { method: 'POST', body: fd }).catch(() => {});
      }

      setCompletedOrderNumber(data.orderNumber || orderId.slice(0, 8));
      setCompletedPaymentMethod(checkout.paymentMethod);
      setCompletedProofUploaded(proofUploaded);
      setOrderComplete(true);
      cart.clear();
      checkout.reset();
    } catch (err) {
      setErrors({ submit: 'Error de conexión. Intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Installments: solo abre WhatsApp con el link de pago — no crea ninguna orden ───
  const handleInstallmentsWhatsApp = () => {
    setSubmitting(true);
    try {
      trackEvent('installments_link_requested', 'ecommerce', {
        total_usd: totalUSD,
        method: 'installments_3',
      });

      const waMessage =
        `¡Hola! Quiero pagar en *3 cuotas sin interés* con tarjeta de crédito.\n\n` +
        `📦 *Productos:*\n${cart.items
          .map((it) => `• ${it.title} (Talle ${it.size}) x${it.quantity} — $${it.price.toFixed(2)} USD`)
          .join('\n')}\n\n` +
        `💰 *Subtotal (precio base):* $${subtotalUSD.toFixed(2)} USD\n` +
        (discountAmount > 0
          ? `🎟 *Cupón ${checkout.appliedDiscount?.code}:* -$${discountAmount.toFixed(2)} USD\n`
          : '') +
        (promoOn
          ? `🔥 *PROMO: SIN recargo*\n`
          : `➕ *Recargo tarjeta (10%):* +$${(discountedSubtotalUSD * surchargeRate).toFixed(2)} USD\n`) +
        `✅ *TOTAL A COBRAR:* $${totalUSD.toFixed(2)} USD (${formatCurrency(totalARS)})\n` +
        `💳 *3 cuotas de:* ${formatCurrency(totalARS / 3)}\n\n` +
        `👤 *Datos del comprador:*\n` +
        `Nombre: ${checkout.contact.firstName} ${checkout.contact.lastName}\n` +
        `DNI: ${checkout.contact.document}\n` +
        `Email: ${checkout.contact.email}\n` +
        `Teléfono: ${checkout.contact.phone}\n\n` +
        (checkout.fulfillment === 'shipping'
          ? `🚚 *Envío a domicilio:*\n` +
            `Dirección: ${checkout.address.street}\n` +
            `Localidad: ${checkout.address.city}\n` +
            `Provincia: ${checkout.address.province}\n` +
            `CP: ${checkout.address.postalCode}`
          : `🏪 *Retiro en Showroom*`);

      const waUrl = whatsappUrl(storeConfig, waMessage);
      if (waUrl) window.open(waUrl, '_blank');

      setCompletedOrderNumber(null);
      setCompletedPaymentMethod('installments_3');
      setCompletedProofUploaded(false);
      setOrderComplete(true);
      cart.clear();
      checkout.reset();
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Proof Upload ───
  const handleProofUpload = (file: File) => {
    setProofFile(file);
    setProofUploaded(true);
    setErrors((e) => {
      const { proof, ...rest } = e;
      return rest;
    });
  };

  // ─── Order Complete Screen ───
  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-white px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {completedPaymentMethod === 'installments_3' ? '¡Listo!' : '¡Orden confirmada!'}
          </h1>
          <p className="text-gray-500 font-bold text-sm">
            {completedPaymentMethod === 'installments_3' ? (
              'Te enviamos tu pedido por WhatsApp para coordinar el link de pago con tarjeta.'
            ) : (
              <>Tu orden <span className="text-gray-900 font-black">{completedOrderNumber}</span> fue registrada con éxito.</>
            )}
          </p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-left space-y-2">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Próximos pasos</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              {completedPaymentMethod === 'crypto_transfer' && !completedProofUploaded && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5">!</span>
                  Envianos el comprobante de transferencia por WhatsApp al{' '}
                  <a href={whatsappUrl(storeConfig) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-black underline">
                    WhatsApp
                  </a>
                </li>
              )}
              {completedPaymentMethod === 'crypto_transfer' && completedProofUploaded && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5">✓</span>
                  Comprobante recibido — lo validaremos a la brevedad
                </li>
              )}
              {completedPaymentMethod === 'installments_3' && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5">✓</span>
                  Te enviaremos el link de pago con tarjeta por WhatsApp
                </li>
              )}
              {completedPaymentMethod === 'cash' && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5">✓</span>
                  Te contactaremos para coordinar el retiro en showroom
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-gray-900 mt-0.5">✓</span>
                Recibirás actualizaciones por WhatsApp o email
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/productos')}
              className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Checkout</h1>
          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white text-gray-900 text-xs flex items-center justify-center font-black">1</span>
              Entrega
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-colors ${
              step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${
                step >= 2 ? 'bg-white text-gray-900' : 'bg-gray-200 text-gray-500'
              }`}>2</span>
              Pago
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* ═══════════════ STEP 1: DELIVERY ═══════════════ */}
            {step === 1 && (
              <>
                {/* Delivery method selector */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Método de entrega
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('pickup')}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        checkout.fulfillment === 'pickup'
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'pickup' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Retiro en Showroom</p>
                        <p className="text-xs text-gray-400 font-bold">Coordinamos por WhatsApp</p>
                      </div>
                      {checkout.fulfillment === 'pickup' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => checkout.setFulfillment('shipping')}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        checkout.fulfillment === 'shipping'
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        checkout.fulfillment === 'shipping' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">Envío a domicilio</p>
                        <p className="text-xs text-gray-500 font-bold">100% Gratis</p>
                      </div>
                      {checkout.fulfillment === 'shipping' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contact info & shipping address */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {checkout.fulfillment === 'shipping' ? 'Datos de envío' : 'Datos de contacto'}
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Nombre y Apellido */}
                    <InputField label="Nombre *" value={checkout.contact.firstName} error={errors.firstName}
                      autoComplete="given-name" inputMode="text"
                      onChange={(v) => checkout.updateContact({ firstName: v })} />
                    <InputField label="Apellido *" value={checkout.contact.lastName} error={errors.lastName}
                      autoComplete="family-name" inputMode="text"
                      onChange={(v) => checkout.updateContact({ lastName: v })} />

                    {/* Email y Teléfono */}
                    <InputField label="Email *" type="email" value={checkout.contact.email} error={errors.email}
                      autoComplete="email" inputMode="email"
                      onChange={(v) => checkout.updateContact({ email: v })} />
                    <InputField label="Teléfono *" type="tel" value={checkout.contact.phone} error={errors.phone}
                      autoComplete="tel" inputMode="tel"
                      onChange={(v) => checkout.updateContact({ phone: v })} />

                    {/* DNI — requerido siempre */}
                    <InputField label="DNI *" value={checkout.contact.document} error={errors.document}
                      autoComplete="off" inputMode="numeric"
                      onChange={(v) => checkout.updateContact({ document: v })} placeholder="Ej: 38123456" />

                    {/* Campos de envío */}
                    {checkout.fulfillment === 'shipping' && (
                      <>
                        <div className="sm:col-span-2">
                          <InputField label="Dirección *" value={checkout.address.street} error={errors.street}
                            autoComplete="street-address" inputMode="text"
                            onChange={(v) => checkout.updateAddress({ street: v })} placeholder="Ej: Av. Libertador 1234, Piso 3 Dto B" />
                        </div>
                        <InputField label="Código Postal *" value={checkout.address.postalCode} error={errors.postalCode}
                          autoComplete="postal-code" inputMode="numeric"
                          onChange={(v) => checkout.updateAddress({ postalCode: v })} placeholder="Ej: 5400" />
                        <InputField label="Localidad *" value={checkout.address.city} error={errors.city}
                          autoComplete="address-level2" inputMode="text"
                          onChange={(v) => checkout.updateAddress({ city: v })} placeholder="Tu ciudad" />
                        <div className="sm:col-span-2">
                          <InputField label="Provincia *" value={checkout.address.province} error={errors.province}
                            autoComplete="address-level1" inputMode="text"
                            onChange={(v) => checkout.updateAddress({ province: v })} placeholder="Tu ciudad" />
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleContinueToPayment}
                    className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    Continuar al pago
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ═══════════════ STEP 2: PAYMENT ═══════════════ */}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-900 font-bold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a entrega
                </button>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Método de pago
                  </h2>

                  <div className="space-y-3">
                    {/* Option A: Cash — ONLY for pickup */}
                    {checkout.fulfillment === 'pickup' && (
                      <PaymentOption
                        selected={checkout.paymentMethod === 'cash'}
                        onClick={() => checkout.setPaymentMethod('cash')}
                        icon={<Banknote className="w-5 h-5" />}
                        title="Efectivo"
                        description="Pagá al retirar en el showroom"
                      />
                    )}

                    {/* Option B: Crypto / Transfer */}
                    <PaymentOption
                      selected={checkout.paymentMethod === 'crypto_transfer'}
                      onClick={() => checkout.setPaymentMethod('crypto_transfer')}
                      icon={<Bitcoin className="w-5 h-5" />}
                      title="Transferencia / Cripto"
                      description="Transferencia bancaria o pago con criptomonedas"
                    />

                    {/* Option C: 3 Cuotas sin interés */}
                    <PaymentOption
                      selected={checkout.paymentMethod === 'installments_3'}
                      onClick={() => checkout.setPaymentMethod('installments_3')}
                      icon={<CreditCard className="w-5 h-5" />}
                      title={
                        promoOn
                          ? '3 Cuotas sin interés (Tarjeta) — PROMO sin recargo'
                          : '3 Cuotas sin interés (Tarjeta)'
                      }
                      description={
                        promoOn
                          ? '🔥 PROMO 11-17/05: mismo precio que efectivo · Link de pago por WhatsApp'
                          : '10% de recargo sobre el precio base · Link de pago por WhatsApp'
                      }
                    />
                  </div>
                </div>

                {/* Payment details panel */}
                {checkout.paymentMethod === 'cash' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Pago en efectivo</p>
                        <p className="text-xs text-gray-400 font-bold">Aboná al momento de retirar en nuestro showroom</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 font-bold">
                        📍 Recordá que tu pedido estará reservado. Te enviaremos la dirección exacta por email.
                      </p>
                    </div>
                  </div>
                )}

                {checkout.paymentMethod === 'crypto_transfer' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-5">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Datos para transferencia</h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {storeConfig.payment.aliasArs && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1">
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alias (Pesos ARS)</p>
                          <p className="text-lg font-black text-gray-900 font-mono">{storeConfig.payment.aliasArs}</p>
                        </div>
                      )}
                      {storeConfig.payment.aliasUsd && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1">
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alias (Dólares USD)</p>
                          <p className="text-lg font-black text-gray-900 font-mono">{storeConfig.payment.aliasUsd}</p>
                        </div>
                      )}
                    </div>
                    {storeConfig.payment.holder && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Titular de la cuenta</p>
                        <p className="text-sm font-black text-gray-900">{storeConfig.payment.holder}</p>
                      </div>
                    )}
                    {storeConfig.payment.cryptoWallet && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cripto (USDT)</p>
                        <p className="text-xs font-bold text-gray-900 font-mono break-all">{storeConfig.payment.cryptoWallet}</p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Monto a transferir</p>
                      <p className="text-xl font-black text-gray-900">${discountedSubtotalUSD.toFixed(2)} USD</p>
                      <p className="text-sm text-gray-500 font-bold">{formatCurrency(discountedSubtotalUSD * dolarOficial)}</p>
                    </div>

                    {/* Proof upload — optional, can submit without */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-black text-gray-900">Subí tu comprobante <span className="text-gray-400 font-medium">(opcional)</span></p>
                      </div>
                      <p className="text-xs text-gray-500 font-medium -mt-1">Podés adjuntarlo ahora o enviárnoslo después por WhatsApp</p>
                      <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        proofUploaded
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-500'
                      }`}>
                        {proofUploaded ? (
                          <>
                            <Check className="w-6 h-6 text-gray-900" />
                            <p className="text-sm text-gray-900 font-black">{proofFile?.name}</p>
                            <p className="text-xs text-gray-400 font-bold">Click para cambiar</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400" />
                            <p className="text-sm text-gray-400 font-bold">
                              Arrastrá o hacé click para subir
                            </p>
                            <p className="text-xs text-gray-500">JPG, PNG o WebP</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleProofUpload(f);
                          }}
                        />
                      </label>
                      {errors.proof && (
                        <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.proof}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {checkout.paymentMethod === 'installments_3' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          3 Cuotas sin interés
                          {promoOn && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-gray-900 text-white text-[9px] font-black uppercase tracking-wider align-middle">
                              Promo
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 font-bold">
                          {promoOn
                            ? 'Promo: SIN recargo, mismo precio que efectivo'
                            : 'Se aplica un 10% de recargo sobre el precio base'}
                        </p>
                      </div>
                    </div>

                    {/* Surcharge breakdown */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-bold">Subtotal (precio base)</span>
                        <span className="text-gray-900 font-bold">${subtotalUSD.toFixed(2)} USD</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-900 font-bold">Cupón {checkout.appliedDiscount?.code}</span>
                          <span className="text-gray-900 font-bold">-${discountAmount.toFixed(2)} USD</span>
                        </div>
                      )}
                      {!promoOn && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-bold">Recargo tarjeta (10%)</span>
                          <span className="text-gray-700 font-bold">+${(discountedSubtotalUSD * surchargeRate).toFixed(2)} USD</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-black">Total con tarjeta</span>
                        <div className="text-right">
                          <p className="text-gray-900 font-black">${totalUSD.toFixed(2)} USD</p>
                          <p className="text-xs text-gray-500 font-bold">{formatCurrency(totalARS)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-900 font-black">3 cuotas de</span>
                        <span className="text-gray-900 font-black">{formatCurrency(totalARS / 3)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallmentsWhatsApp}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Confirmar y abrir WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Submit error */}
                {errors.submit && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 font-bold">{errors.submit}</p>
                  </div>
                )}

                {/* Confirm button */}
                {checkout.paymentMethod && checkout.paymentMethod !== 'installments_3' && (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Confirmar orden
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ═══════════════ ORDER SUMMARY SIDEBAR ═══════════════ */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Resumen del pedido</h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.map((it) => (
                  <div key={`${it.productId}-${it.size}`} className="flex gap-3">
                    <div className="relative shrink-0">
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded-lg object-contain bg-gray-50 border border-gray-200" />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-[10px] font-black flex items-center justify-center">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{it.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Talle: {it.size}</p>
                    </div>
                    <p className="text-xs font-black text-gray-900 whitespace-nowrap">
                      ${(it.price * it.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Cupón de descuento */}
              <div className="border-t border-gray-200 pt-3">
                {checkout.appliedDiscount ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-900 px-3 py-2">
                    <span className="text-xs font-black text-white">
                      🎟 {checkout.appliedDiscount.code} aplicado
                    </span>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-white underline hover:text-gray-300"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="¿Tenés un cupón?"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-900"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponValidating || !couponInput.trim()}
                        className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-black uppercase hover:bg-black disabled:opacity-50 transition-colors"
                      >
                        {couponValidating ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 font-bold">{couponError}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Subtotal</span>
                  <span className="text-gray-900 font-black">${subtotalUSD.toFixed(2)} USD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-bold">Cupón {checkout.appliedDiscount?.code}</span>
                    <span className="text-gray-900 font-black">-${discountAmount.toFixed(2)} USD</span>
                  </div>
                )}
                {isCardPayment && !promoOn && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Recargo tarjeta (10%)</span>
                    <span className="text-gray-700 font-black">+${(discountedSubtotalUSD * surchargeRate).toFixed(2)} USD</span>
                  </div>
                )}
                {isCardPayment && promoOn && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-bold">🔥 Promo · sin recargo</span>
                    <span className="text-gray-900 font-black">$0.00 USD</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Envío</span>
                  <span className="text-gray-500 font-bold">Gratis</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-black uppercase">Total</span>
                  <div className="text-right">
                    <p className="text-gray-900 font-black">${totalUSD.toFixed(2)} USD</p>
                    <p className="text-xs text-gray-500 font-bold">{formatCurrency(totalARS)}</p>
                  </div>
                </div>
                {isCardPayment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-black">3 cuotas de</span>
                    <span className="text-gray-900 font-black">{formatCurrency(totalARS / 3)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer warning */}
            {cart.getRemainingSeconds() !== null && (
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-700 shrink-0" />
                <p className="text-xs text-gray-700 font-bold">
                  Completá tu compra antes de que expire el carrito
                </p>
              </div>
            )}

            {/* Security badges */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-gray-900" />
                <span className="font-bold">Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Package className="w-4 h-4 text-gray-900" />
                <span className="font-bold">Productos originales garantizados</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Components ─── */

function InputField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required = true,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url' | 'none';
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-gray-900 font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-gray-300 focus:border-gray-900 focus:ring-gray-100'
        }`}
      />
      <p className={`mt-1 text-xs text-red-400 font-bold min-h-[1rem] ${error ? '' : 'invisible'}`}>{error || ' '}</p>
    </div>
  );
}

function PaymentOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 font-bold">{description}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}
