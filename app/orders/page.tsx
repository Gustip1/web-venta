"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string | null;
  status: 'draft' | 'paid' | 'fulfilled' | 'cancelled';
  fulfillment: 'pickup' | 'shipping';
  email: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  updated_at: string;
}

const statusLabels = {
  draft: 'Borrador',
  paid: 'Pagado',
  fulfilled: 'Entregado',
  cancelled: 'Cancelado'
};

const fulfillmentLabels = {
  pickup: 'Retiro en tienda',
  shipping: 'Envío a domicilio'
};

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }
      setUser(authUser);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);
      setLoading(false);
    })();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <p className="text-sm text-gray-400 font-bold">Cargando pedidos...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis pedidos</h1>
        <Link
          href="/account"
          className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm text-gray-900 font-bold hover:bg-gray-200 transition-colors"
        >
          Volver a mi cuenta
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-500 font-bold">No tienes pedidos aún.</p>
          <Link
            href="/productos"
            className="mt-3 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black transition-colors"
          >
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900">
                      {order.order_number || `Pedido #${order.id.slice(0, 8)}`}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        order.status === 'paid'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : order.status === 'fulfilled'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : order.status === 'cancelled'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <p>Modalidad: {fulfillmentLabels[order.fulfillment]}</p>
                    <p>Total: ${order.total.toFixed(2)}</p>
                    <p>Fecha: {new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {order.order_number && (
                  <Link
                    href={`/track?order=${order.order_number}&email=${order.email}`}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs text-gray-900 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Seguir
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
