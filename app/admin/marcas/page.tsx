"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Brand } from '@/types/db';
import { Plus, Trash2, Tag } from 'lucide-react';

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function MarcasPage() {
  const supabase = createBrowserClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('brands').select('*').order('name');
    setBrands((data || []) as Brand[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('brands').insert({ name: name.trim(), slug: slugify(name.trim()) });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setName('');
    load();
  };

  const toggle = async (brand: Brand) => {
    await supabase.from('brands').update({ active: !brand.active }).eq('id', brand.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    await supabase.from('brands').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
          <Tag className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-sm text-gray-500">Gestioná las marcas que aparecen en el carrusel y el buscador</p>
        </div>
      </div>

      {/* Formulario nuevo */}
      <form onSubmit={add} className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la marca</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej: Nude Project"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Agregar'}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay marcas. Agregá una arriba.</p>
      ) : (
        <div className="space-y-2">
          {brands.map(brand => (
            <div
              key={brand.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold text-base ${brand.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                  {brand.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">/{brand.slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(brand)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    brand.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {brand.active ? 'Activa' : 'Oculta'}
                </button>
                <button
                  onClick={() => remove(brand.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 text-sm text-violet-700">
        <strong>Tip:</strong> Las marcas activas aparecen en el carrusel de la landing y se pueden buscar en el buscador.
        Asigná la marca a cada producto desde <a href="/admin/productos" className="underline font-bold">Productos</a>.
      </div>
    </div>
  );
}
