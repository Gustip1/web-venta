"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, STREETWEAR_SUBCATEGORIES } from '@/types/db';
import { revalidateHome } from '@/lib/admin/revalidateHome';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setProducts((data || []) as unknown as Product[]));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (subcategoryFilter && p.subcategory !== subcategoryFilter) return false;
      if (activeFilter === 'active' && !p.active) return false;
      if (activeFilter === 'inactive' && p.active) return false;
      return true;
    });
  }, [products, q, category, subcategoryFilter, activeFilter]);

  const inactiveCount = useMemo(() => products.filter(p => !p.active).length, [products]);

  const deleteInactiveProducts = async () => {
    const inactiveProducts = products.filter(p => !p.active);
    if (inactiveProducts.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar ${inactiveProducts.length} producto(s) inactivo(s)? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const supabase = createBrowserClient();
    const ids = inactiveProducts.map(p => p.id);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      setProducts(prev => prev.filter(p => p.active));
      await revalidateHome();
    }
    setDeleting(false);
  };

  const deleteSingleProduct = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    const supabase = createBrowserClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
      await revalidateHome();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 text-black">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Productos</h1>
        <Link 
          href="/admin/productos/nuevo" 
          className="w-full sm:w-auto text-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors active:scale-95"
        >
          + Nuevo producto
        </Link>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-black mb-1">Buscar</label>
          <input 
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Buscar por título..."
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-black mb-1">Categoría</label>
          <select 
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={category} 
            onChange={(e) => { setCategory(e.target.value); if (e.target.value !== 'streetwear') setSubcategoryFilter(''); }}
          >
            <option value="">Todas</option>
            <option value="sneakers">Sneakers</option>
            <option value="streetwear">Streetwear</option>
          </select>
        </div>
        {category === 'streetwear' && (
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-black mb-1">Subcategoría</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {STREETWEAR_SUBCATEGORIES.map((sub) => (
                <option key={sub.value} value={sub.value}>
                  {sub.icon} {sub.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-black mb-1">Estado</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos ({inactiveCount})</option>
          </select>
        </div>
      </div>

      {activeFilter === 'inactive' && inactiveCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            Hay <span className="font-bold">{inactiveCount}</span> producto(s) inactivo(s) (sin stock).
          </p>
          <button
            onClick={deleteInactiveProducts}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Eliminando...' : `🗑️ Eliminar todos los inactivos`}
          </button>
        </div>
      )}

      {/* Vista de tabla para desktop */}
      <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Título</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Categoría</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Destacado</th>
                <th className="px-4 lg:px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 lg:px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">{p.title}</td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        p.category === 'sneakers' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {p.category === 'sneakers' ? 'Sneakers' : 'Streetwear'}
                      </span>
                      {p.subcategory && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ml-1">
                          {STREETWEAR_SUBCATEGORIES.find(s => s.value === p.subcategory)?.label || p.subcategory}
                        </span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        p.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.featured_sneakers || p.featured_streetwear ? '⭐ Sí' : '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/admin/productos/${p.id}`} 
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Editar →
                        </Link>
                        {!p.active && (
                          <button
                            onClick={() => deleteSingleProduct(p.id, p.title)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de tarjetas para móvil */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">No se encontraron productos</p>
          </div>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              href={`/admin/productos/${p.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-medium text-gray-900 text-sm flex-1 line-clamp-2">{p.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium text-sm whitespace-nowrap">Editar →</span>
                  {!p.active && (
                    <button
                      onClick={(e) => { e.preventDefault(); deleteSingleProduct(p.id, p.title); }}
                      className="text-red-600 font-medium text-sm whitespace-nowrap"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex px-2 py-1 rounded-full font-medium ${
                  p.category === 'sneakers' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {p.category === 'sneakers' ? 'Sneakers' : 'Streetwear'}
                </span>
                {p.subcategory && (
                  <span className="inline-flex px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                    {STREETWEAR_SUBCATEGORIES.find(s => s.value === p.subcategory)?.label || p.subcategory}
                  </span>
                )}
                <span className={`inline-flex px-2 py-1 rounded-full font-medium ${
                  p.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {p.active ? 'Activo' : 'Inactivo'}
                </span>
                {(p.featured_sneakers || p.featured_streetwear) && (
                  <span className="inline-flex px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
                    ⭐ Destacado
                  </span>
                )}
                <span className="ml-auto font-semibold text-gray-900">
                  ${Number(p.price).toFixed(2)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="text-sm text-gray-500 pt-2">
        Mostrando {filtered.length} de {products.length} productos
      </div>
    </div>
  );
}


