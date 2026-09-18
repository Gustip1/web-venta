"use client";
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, ProductVariant } from '@/types/db';
import { revalidateHome } from '@/lib/admin/revalidateHome';

interface ProductWithVariants extends Product {
  variants?: ProductVariant[];
}

export default function AdminStockPage() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [editPrice, setEditPrice] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsData) {
      const productsWithVariants = await Promise.all(
        productsData.map(async (product) => {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .order('size', { ascending: true });
          
          return {
            ...product,
            variants: variants || []
          } as ProductWithVariants;
        })
      );
      
      setProducts(productsWithVariants as any);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const startEdit = (product: ProductWithVariants) => {
    setEditingId(product.id);
    setEditVariants(product.variants || []);
    setEditPrice(String(product.price));
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditVariants([]);
    setEditPrice('');
    setMessage(null);
  };

  const saveChanges = async (productId: string) => {
    setMessage(null);

    // Calcular stock total para decidir si el producto queda activo
    const totalStock = editVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const shouldBeActive = totalStock > 0;
    
    // Actualizar precio y estado activo según stock
    const { error: priceError } = await supabase
      .from('products')
      .update({ price: parseFloat(editPrice), active: shouldBeActive })
      .eq('id', productId);

    if (priceError) {
      setMessage(`Error al actualizar precio: ${priceError.message}`);
      return;
    }

    // Actualizar variantes
    const { error: variantsError } = await supabase
      .from('product_variants')
      .upsert(
        editVariants.map((v) => ({
          id: v.id,
          product_id: productId,
          size: v.size,
          stock: v.stock
        }))
      );

    if (variantsError) {
      setMessage(`Error al actualizar stock: ${variantsError.message}`);
      return;
    }

    setMessage(totalStock === 0
      ? '✓ Guardado — producto marcado como inactivo (stock 0)'
      : '✓ Cambios guardados correctamente');
    await loadProducts();
    await revalidateHome();
    setEditingId(null);
  };

  const addVariant = () => {
    setEditVariants([
      ...editVariants,
      {
        id: crypto.randomUUID(),
        product_id: editingId!,
        size: '',
        stock: 0
      }
    ]);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...editVariants];
    newVariants.splice(index, 1);
    setEditVariants(newVariants);
  };

  const getTotalStock = (variants?: ProductVariant[]) => {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">📦 Gestión de Stock y Precios</h1>
        <div className="text-sm text-neutral-600">
          {products.length} productos
        </div>
      </div>

      {/* Buscador */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
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
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio USD</th>
                <th className="p-4">Stock Total</th>
                <th className="p-4">Talles</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <>
                  <tr key={product.id} className="border-b hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="relative w-16 h-16 rounded overflow-hidden bg-neutral-100">
                        {product.images?.[0]?.url && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-black">{product.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{product.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.category === 'sneakers' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {product.category === 'sneakers' ? '👟' : '👕'} {product.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-black">${Number(product.price).toFixed(2)}</div>
                    </td>
                    <td className="p-4">
                      <div className={`font-semibold ${
                        getTotalStock(product.variants) === 0 
                          ? 'text-red-600' 
                          : getTotalStock(product.variants) < 10 
                          ? 'text-orange-600' 
                          : 'text-green-600'
                      }`}>
                        {getTotalStock(product.variants)} unidades
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {product.variants && product.variants.length > 0 ? (
                          product.variants.map((v, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                v.stock === 0
                                  ? 'bg-red-100 text-red-700'
                                  : v.stock < 5
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {v.size}: {v.stock}
                            </span>
                          ))
                        ) : (
                          <span className="text-neutral-400 text-xs">Sin talles</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {editingId === product.id ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => saveChanges(product.id)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            💾 Guardar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 bg-neutral-600 text-white rounded-lg text-xs font-medium hover:bg-neutral-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingId === product.id && (
                    <tr className="bg-blue-50">
                      <td colSpan={7} className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-bold text-black">Editando: {product.title}</div>
                          </div>
                          
                          {/* Editar Precio */}
                          <div>
                            <label className="block text-sm font-medium text-black mb-1">
                              Precio USD
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-48 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </div>

                          {/* Editar Variantes/Stock */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-black">
                                Talles y Stock
                              </label>
                              <button
                                onClick={addVariant}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                              >
                                + Agregar Talle
                              </button>
                            </div>
                            <div className="space-y-2">
                              {editVariants.map((variant, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Talle"
                                    value={variant.size}
                                    onChange={(e) => {
                                      const newVariants = [...editVariants];
                                      newVariants[idx].size = e.target.value;
                                      setEditVariants(newVariants);
                                    }}
                                    className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Stock"
                                    min="0"
                                    value={variant.stock}
                                    onChange={(e) => {
                                      const newVariants = [...editVariants];
                                      newVariants[idx].stock = parseInt(e.target.value) || 0;
                                      setEditVariants(newVariants);
                                    }}
                                    className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                                  />
                                  <button
                                    onClick={() => removeVariant(idx)}
                                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


