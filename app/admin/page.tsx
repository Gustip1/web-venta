"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Package, ShoppingCart, DollarSign, Users, AlertTriangle } from 'lucide-react';

interface Stats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  revenue: number;
  monthlyRevenue: number;
  lowStockProducts: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const supabase = createBrowserClient();

  useEffect(() => {
    void loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    // Products
    const { data: allProducts } = await supabase.from('products').select('id, active');
    const totalProducts = allProducts?.length || 0;
    const activeProducts = (allProducts || []).filter((p: any) => p.active).length;

    // Orders
    const { data: orders } = await supabase.from('orders').select('id, total, status, created_at');
    const totalOrders = orders?.length || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = (orders || []).filter((o: any) => new Date(o.created_at) >= today).length;
    const pendingOrders = (orders || []).filter((o: any) => o.status === 'paid').length;
    const revenue = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const month = new Date().getMonth();
    const monthlyRevenue = (orders || [])
      .filter((o: any) => new Date(o.created_at).getMonth() === month)
      .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

    // Customers
    const { data: customers } = await supabase.from('profiles').select('id').eq('role', 'user');
    const totalCustomers = customers?.length || 0;

    // Low stock (variants with stock <= 2)
    const { data: lowStock } = await supabase
      .from('product_variants')
      .select('id, stock')
      .lte('stock', 2);
    const lowStockProducts = lowStock?.length || 0;

    setStats({
      totalProducts,
      activeProducts,
      totalOrders,
      todayOrders,
      pendingOrders,
      revenue,
      monthlyRevenue,
      lowStockProducts,
      totalCustomers
    });

    // Recent orders
    const { data: recent } = await supabase
      .from('orders')
      .select('id, order_number, status, total, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentOrders(recent || []);
  };

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
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Productos activos</div>
                    <div className="text-lg font-semibold">{stats.activeProducts}/{stats.totalProducts}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/productos" className="text-blue-600 hover:text-blue-500">Ver productos</Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Pedidos hoy</div>
                    <div className="text-lg font-semibold">{stats.todayOrders}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/pedidos" className="text-blue-600 hover:text-blue-500">Ver pedidos</Link>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Ingresos del mes</div>
                    <div className="text-lg font-semibold">${stats.monthlyRevenue.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm text-gray-600">
                Total histórico: ${stats.revenue.toFixed(2)}
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-gray-400" />
                  <div className="ml-4">
                    <div className="text-sm text-gray-500">Clientes</div>
                    <div className="text-lg font-semibold">{stats.totalCustomers}</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 text-sm">
                <Link href="/admin/clientes" className="text-blue-600 hover:text-blue-500">Ver clientes</Link>
              </div>
            </div>
          </div>

          {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {stats.pendingOrders > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800">{stats.pendingOrders} pedidos pendientes de envío</div>
                      <Link href="/admin/pedidos?status=paid" className="text-sm text-yellow-800 underline">Ver pedidos →</Link>
                    </div>
                  </div>
                </div>
              )}
              {stats.lowStockProducts > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="text-sm font-medium text-red-800">{stats.lowStockProducts} variantes con stock bajo</div>
                      <Link href="/admin/stock" className="text-sm text-red-800 underline">Revisar stock →</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Pedidos recientes</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.order_number || `#${order.id.slice(0, 8)}`}</div>
                      <div className="text-sm text-gray-500">{order.first_name} {order.last_name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      <span className="text-sm font-semibold">${Number(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-gray-50">
              <Link href="/admin/pedidos" className="text-sm text-blue-600 hover:text-blue-500">Ver todos los pedidos →</Link>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Destacados</h2>
            </div>
            <div className="p-6 overflow-hidden">
              <div className="flex gap-4 overflow-x-auto snap-x">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="snap-start min-w-[220px] rounded-lg border border-gray-200 p-4 bg-white text-sm text-gray-700">
                    Item #{i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


