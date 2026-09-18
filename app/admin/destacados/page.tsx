"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { revalidateHome } from '@/lib/admin/revalidateHome';

export default function AdminFeaturedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setProducts((data || []) as any);
        setLoading(false);
      });
  }, []);

  const toggle = async (id: string, key: 'featured_sneakers' | 'featured_streetwear', value: boolean) => {
    setMessage(null);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('products')
      .update({ [key]: value })
      .eq('id', id);
    
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✓ Actualizado correctamente');
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [key]: value } as any : p))
      );
      await revalidateHome();
    }
  };

  const featuredSneakers = products.filter(p => p.featured_sneakers);
  const featuredStreetwear = products.filter(p => p.featured_streetwear);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">⭐ Gestión de Destacados</h1>
        <div className="flex gap-4 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span>{featuredSneakers.length} Sneakers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <span>{featuredStreetwear.length} Streetwear</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${
          message.includes('Error') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-neutral-600">Cargando productos...</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50">
              <tr className="border-b text-xs text-neutral-700 uppercase tracking-wider">
                <th className="p-4">Imagen</th>
                <th className="p-4">Título</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-center">👟 Sneakers</th>
                <th className="p-4 text-center">👕 Streetwear</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const bgColor = p.featured_sneakers && p.featured_streetwear 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50'
                  : p.featured_sneakers 
                  ? 'bg-blue-50' 
                  : p.featured_streetwear 
                  ? 'bg-purple-50' 
                  : '';

                return (
                  <tr 
                    key={p.id} 
                    className={`border-b hover:bg-neutral-50 transition-colors ${bgColor}`}
                  >
                    <td className="p-4">
                      <div className="relative w-16 h-16 rounded overflow-hidden bg-neutral-100">
                        {p.images?.[0]?.url && (
                          <img
                            src={p.images[0].url}
                            alt={p.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-black">{p.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{p.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.category === 'sneakers' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {p.category === 'sneakers' ? '👟 ' : '👕 '}
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-black">USD ${Number(p.price).toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.featured_sneakers}
                          onChange={(e) => toggle(p.id, 'featured_sneakers', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="p-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.featured_streetwear}
                          onChange={(e) => toggle(p.id, 'featured_streetwear', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


