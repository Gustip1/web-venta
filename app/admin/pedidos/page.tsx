"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  title: string;
  size: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string | null;
  status: 'draft' | 'paid' | 'fulfilled' | 'cancelled';
  fulfillment: 'pickup' | 'shipping';
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
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
  order_items?: OrderItem[];
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  paid: 'Pagado',
  fulfilled: 'Entregado',
  cancelled: 'Cancelado'
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  paid: 'bg-green-100 text-green-800',
  fulfilled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

const paymentLabels: Record<string, string> = {
  cash: '💵 Efectivo',
  crypto_transfer: '🏦 Transferencia/Cripto',
  bank_transfer: '🏦 Transferencia',
  installments_3: '💳 3 Cuotas',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  validated: 'Validado',
  rejected: 'Rechazado',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  validated: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminOrdersPage() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items(id, title, size, quantity, price)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setOrders((data || []) as Order[]);
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  };

  const deleteOrder = async (orderId: string, status: Order['status']) => {
    const message =
      status === 'cancelled'
        ? '¿Seguro que querés eliminar esta orden? Los productos volverán al stock.'
        : '¿Seguro que querés eliminar esta orden entregada? Esta acción no se puede deshacer.';
    if (!confirm(message)) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      loadOrders();
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'No se pudo eliminar la orden');
  };

  const filteredOrders = orders.filter(order => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.email?.toLowerCase().includes(searchLower) ||
        `${order.first_name} ${order.last_name}`.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'draft').length;
  const paidOrders = orders.filter((o) => o.status === 'paid').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">{totalOrders} órdenes en total</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, email, # orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="paid">Pagado</option>
            <option value="fulfilled">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total órdenes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagadas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{paidOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingresos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      ) : (
        <>
          {/* Vista de tabla para desktop */}
          <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Artículos
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.fulfillment === 'pickup' ? '📦 Retiro' : '🚚 Envío'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {order.first_name} {order.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{order.email}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-xs text-gray-600 max-w-[180px]">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="space-y-0.5">
                              {order.order_items.slice(0, 2).map((item) => (
                                <div key={item.id} className="truncate">
                                  {item.title} <span className="text-gray-400">({item.size}) x{item.quantity}</span>
                                </div>
                              ))}
                              {order.order_items.length > 2 && (
                                <div className="text-gray-400 italic">+{order.order_items.length - 2} más</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-700 font-medium">
                          {paymentLabels[order.payment_method || ''] || order.payment_method || '—'}
                        </div>
                        {order.payment_status && (
                          <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            paymentStatusColors[order.payment_status] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {paymentStatusLabels[order.payment_status] || order.payment_status}
                          </span>
                        )}
                        {order.payment_proof_url && (
                          <button
                            onClick={() => setProofModal(order.payment_proof_url)}
                            className="block mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline"
                          >
                            📄 Ver comprobante
                          </button>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/pedidos/${order.id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Ver detalles
                          </Link>
                          {order.status === 'draft' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'paid')}
                              className="text-green-600 hover:text-green-900 text-xs font-semibold"
                            >
                              ✓ Pagado
                            </button>
                          )}
                          {order.status === 'paid' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'fulfilled')}
                              className="text-blue-600 hover:text-blue-900 text-xs font-semibold"
                            >
                              📦 Entregado
                            </button>
                          )}
                          {(order.status === 'cancelled' || order.status === 'fulfilled') && (
                            <button
                              onClick={() => deleteOrder(order.id, order.status)}
                              className="text-red-500 hover:text-red-700 text-xs font-semibold"
                              title="Eliminar orden"
                            >
                              🗑 Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron pedidos.</p>
              </div>
            )}
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">No se encontraron pedidos</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="block p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {order.first_name} {order.last_name}
                        </div>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    
                    {/* Items preview */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {order.order_items.slice(0, 2).map((item) => (
                          <p key={item.id} className="text-xs text-gray-600 truncate">
                            • {item.title} ({item.size}) x{item.quantity}
                          </p>
                        ))}
                        {order.order_items.length > 2 && (
                          <p className="text-xs text-gray-400 italic">+{order.order_items.length - 2} más</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>{order.fulfillment === 'pickup' ? '📦 Retiro' : '🚚 Envío'}</span>
                        <span className="text-gray-300">|</span>
                        <span>{paymentLabels[order.payment_method || ''] || '—'}</span>
                      </div>
                      <span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        ${order.total.toFixed(2)}
                      </span>
                      <span className="text-blue-600 font-medium text-sm">
                        Ver detalles →
                      </span>
                    </div>
                  </Link>
                  
                  {/* Payment proof quick action */}
                  {order.payment_proof_url && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => setProofModal(order.payment_proof_url)}
                        className="text-xs text-blue-600 font-semibold underline"
                      >
                        📄 Ver comprobante de pago
                      </button>
                    </div>
                  )}
                  {(order.status === 'cancelled' || order.status === 'fulfilled') && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => deleteOrder(order.id, order.status)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold"
                      >
                        🗑 Eliminar orden
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Comprobante de pago</h3>
              <button
                onClick={() => setProofModal(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={proofModal}
                alt="Comprobante de pago"
                className="max-w-[280px] max-h-[400px] object-contain rounded-lg border border-gray-200"
              />
            </div>
            <div className="p-4 pt-0 flex gap-2">
              <a
                href={proofModal}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Abrir en nueva pestaña
              </a>
              <button
                onClick={() => setProofModal(null)}
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
