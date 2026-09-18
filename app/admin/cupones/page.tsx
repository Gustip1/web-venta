"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { DiscountCode, DiscountType } from '@/types/db';
import { Plus, Trash2, Ticket } from 'lucide-react';

export default function CuponesPage() {
  const supabase = createBrowserClient();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percent');
  const [value, setValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = async () => {
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
    setCodes((data || []) as DiscountCode[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value.trim()) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('discount_codes').insert({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setCode('');
    setValue('');
    setMaxUses('');
    setEndsAt('');
    load();
  };

  const toggle = async (dc: DiscountCode) => {
    await supabase.from('discount_codes').update({ active: !dc.active }).eq('id', dc.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este cupón?')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cupones</h1>
          <p className="text-sm text-gray-500">Códigos de descuento que los clientes pueden aplicar en el checkout</p>
        </div>
      </div>

      {/* Formulario nuevo */}
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ej: BIENVENIDO10"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Monto fijo (USD)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'percent' ? 'ej: 10' : 'ej: 15'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Máx. usos</label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Sin límite"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vence</label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="sm:col-span-5">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <button
            type="submit"
            disabled={saving || !code.trim() || !value.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Crear cupón'}
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay cupones creados todavía.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((dc) => (
            <div
              key={dc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-base ${dc.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                  {dc.code}
                </span>
                <span className="text-xs text-gray-500">
                  {dc.type === 'percent' ? `${dc.value}%` : `$${dc.value} USD`}
                </span>
                <span className="text-xs text-gray-400">
                  {dc.used_count} usado{dc.used_count === 1 ? '' : 's'}
                  {dc.max_uses !== null ? ` / ${dc.max_uses}` : ''}
                </span>
                {dc.ends_at && (
                  <span className="text-xs text-gray-400">
                    vence {new Date(dc.ends_at).toLocaleDateString('es-AR')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(dc)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    dc.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {dc.active ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => remove(dc.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
        <strong>Tip:</strong> el descuento se calcula sobre el subtotal, antes del recargo de tarjeta. El cliente lo ingresa en el checkout, en el resumen del pedido.
      </div>
    </div>
  );
}
