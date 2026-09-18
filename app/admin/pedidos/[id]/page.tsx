"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string | null;
  status: 'draft' | 'paid' | 'fulfilled' | 'cancelled';
  fulfillment: 'pickup' | 'shipping';
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

interface ShippingAddress {
  street: string | null;
  number: string | null;
  unit: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
}

const paymentLabels: Record<string, string> = {
  cash: '💵 Efectivo',
  crypto_transfer: '🏦 Transferencia / Cripto',
  bank_transfer: '🏦 Transferencia bancaria',
  installments_3: '💳 3 Cuotas sin interés',
};

const paymentStatusLabels: Record<string, string> = {
  pending: '⏳ Pendiente de validación',
  validated: '✅ Pago validado',
  rejected: '❌ Pago rechazado',
};

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [address, setAddress] = useState<ShippingAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [validating, setValidating] = useState(false);
  const [proofModal, setProofModal] = useState(false);

  const loadOrderDetails = useCallback(async () => {
    setLoading(true);

    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!orderData) {
      router.push('/admin/pedidos');
      return;
    }

    setOrder(orderData);
    setCarrier(orderData.carrier || '');
    setTrackingNumber(orderData.tracking_number || '');
    setTrackingUrl(orderData.tracking_url || '');

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    setItems(itemsData || []);

    if (orderData.fulfillment === 'shipping') {
      const { data: addressData } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('order_id', params.id)
        .single();

      setAddress(addressData);
    }

    setLoading(false);
  }, [params.id, router, supabase]);

  useEffect(() => {
    void loadOrderDetails();
  }, [loadOrderDetails]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', params.id);

    if (!error) loadOrderDetails();
  };

  const updatePaymentStatus = async (paymentStatus: string) => {
    setValidating(true);
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', params.id);
    setValidating(false);
    if (!error) {
      await loadOrderDetails();
    }
  };

  const updateTracking = async () => {
    const { error } = await supabase
      .from('orders')
      .update({
        carrier: carrier || null,
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null
      })
      .eq('id', params.id);

    if (!error) {
      loadOrderDetails();
      alert('Información de seguimiento actualizada');
    }
  };

  const deleteOrder = async () => {
    if (!confirm('¿Seguro que querés eliminar esta orden? Los productos volverán al stock.')) return;
    const res = await fetch(`/api/admin/orders/${params.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.push('/admin/pedidos');
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'No se pudo eliminar la orden');
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cargando pedido...</p>
      </div>
    );
  }

  if (!order) return null;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    fulfilled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    paid: 'Pagado',
    fulfilled: 'Entregado',
    cancelled: 'Cancelado'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/admin/pedidos"
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.order_number || `Pedido #${order.id.slice(0, 8)}`}
          </h1>
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {order.status === 'draft' && (
            <button
              onClick={() => updateStatus('paid')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ Marcar como pagado
            </button>
          )}
          {order.status === 'paid' && (
            <button
              onClick={() => updateStatus('fulfilled')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              📦 Marcar como entregado
            </button>
          )}
          {order.status !== 'cancelled' && order.status !== 'fulfilled' && (
            <button
              onClick={() => {
                if (confirm('¿Seguro que querés cancelar esta orden?')) updateStatus('cancelled');
              }}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200"
            >
              Cancelar orden
            </button>
          )}
          {order.status === 'cancelled' && (
            <button
              onClick={deleteOrder}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              🗑 Eliminar orden
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Productos</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                        Talle: {item.size}
                      </span>
                      <span className="text-xs text-gray-500">x{item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-500">${item.price.toFixed(2)} c/u</p>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  ${order.total.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pago</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Método</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {paymentLabels[order.payment_method || ''] || order.payment_method || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estado del pago</span>
                <span className="text-sm font-semibold">
                  {paymentStatusLabels[order.payment_status || ''] || order.payment_status || '—'}
                </span>
              </div>
              
              {/* Payment proof */}
              {order.payment_proof_url && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Comprobante de pago</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setProofModal(true)}
                      className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      👁 Ver comprobante
                    </button>
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      ↗ Abrir en nueva pestaña
                    </a>
                  </div>
                </div>
              )}

              {/* Payment actions */}
              {order.payment_status !== 'validated' && order.payment_method !== 'cash' && (
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => updatePaymentStatus('validated')}
                    disabled={validating}
                    className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    ✅ Validar pago
                  </button>
                  <button
                    onClick={() => updatePaymentStatus('rejected')}
                    disabled={validating}
                    className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tracking */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportista</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Ej: Correo Argentino, OCA, Andreani"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de seguimiento</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Número de tracking"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de seguimiento</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={updateTracking}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Actualizar seguimiento
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cliente</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-500 text-xs uppercase tracking-wider">Nombre</span>
                <p className="font-semibold text-gray-900">
                  {order.first_name} {order.last_name}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-500 text-xs uppercase tracking-wider">Email</span>
                <p className="font-semibold text-gray-900">{order.email || '—'}</p>
              </div>
              {order.phone && (
                <div>
                  <span className="font-medium text-gray-500 text-xs uppercase tracking-wider">Teléfono</span>
                  <p className="font-semibold text-gray-900">{order.phone}</p>
                </div>
              )}
              {order.document && (
                <div>
                  <span className="font-medium text-gray-500 text-xs uppercase tracking-wider">Documento</span>
                  <p className="font-semibold text-gray-900">{order.document}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          {order.fulfillment === 'shipping' && address && (
            <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Dirección de envío</h2>
              <div className="text-sm text-gray-900 space-y-1">
                <p className="font-semibold">{address.street} {address.number}</p>
                {address.unit && <p>Piso/Depto: {address.unit}</p>}
                <p>{address.city}, {address.province}</p>
                <p>CP: {address.postal_code}</p>
                {address.notes && (
                  <p className="mt-2 text-gray-500 italic">Notas: {address.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Info del pedido</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Modalidad</span>
                <span className="font-semibold text-gray-900">
                  {order.fulfillment === 'pickup' ? '📦 Retiro en tienda' : '🚚 Envío a domicilio'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Creado</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.created_at).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actualizado</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.updated_at).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Modal */}
      {proofModal && order.payment_proof_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Comprobante de pago</h3>
              <button
                onClick={() => setProofModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={order.payment_proof_url}
                alt="Comprobante de pago"
                className="max-w-[280px] max-h-[400px] object-contain rounded-lg border border-gray-200"
              />
            </div>
            <div className="p-4 pt-0 flex gap-2">
              <a
                href={order.payment_proof_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Abrir en nueva pestaña
              </a>
              <button
                onClick={() => setProofModal(false)}
                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
