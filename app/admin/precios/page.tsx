"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { revalidateHome } from '@/lib/admin/revalidateHome';

export default function BulkPricingPage() {
  const supabase = createBrowserClient();

  // ── Tipo de cambio: convierte los precios en USD a moneda local en toda la tienda ──
  const [rate, setRate] = useState<number>(0);
  const [rateLoading, setRateLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'usd_ars_rate')
        .maybeSingle();
      if (data) setRate(Number(data.value));
      setRateLoading(false);
    })();
    // El cliente de Supabase se crea una vez por render y no cambia de identidad útil acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRate = async () => {
    setSavingRate(true);
    setRateMessage(null);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'usd_ars_rate', value: rate }, { onConflict: 'key' });
    setRateMessage(error ? `No se pudo guardar: ${error.message}` : '✓ Tipo de cambio actualizado');
    if (!error) await revalidateHome();
    setSavingRate(false);
  };

  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = async () => {
    setMessage(null);
    setConfirming(false);
    // Actualización masiva usando la función SQL bulk_update_prices
    const { error } = await supabase.rpc('bulk_update_prices', {
      p_mode: mode,
      p_value: value,
      p_category: category || null
    });
    if (error) setMessage(error.message);
    else {
      setMessage('Precios actualizados');
      await revalidateHome();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Tipo de cambio ── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Tipo de cambio</h1>
        <p className="mt-1 max-w-lg text-sm text-gray-500">
          Cuánto vale 1 USD en tu moneda. Los productos se cargan en dólares y la tienda muestra el
          precio convertido con este valor.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="usd_rate" className="block text-sm font-medium text-gray-700">
              Valor de 1 USD
            </label>
            <input
              id="usd_rate"
              type="number"
              step="0.01"
              value={rate}
              disabled={rateLoading}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 w-48 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={saveRate}
            disabled={savingRate || rateLoading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-50"
          >
            {savingRate ? 'Guardando…' : 'Guardar'}
          </button>
          {rateMessage && (
            <span className={`text-sm font-medium ${rateMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
              {rateMessage}
            </span>
          )}
        </div>
      </div>

      {/* ── Actualización masiva ── */}
      <h1 className="text-xl font-semibold">Precios (Bulk)</h1>
      <div className="grid max-w-xl grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white">Modo</label>
          <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Fijo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Valor</label>
          <input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Categoría</label>
          <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            <option value="sneakers">Sneakers</option>
            <option value="streetwear">Streetwear</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setConfirming(true)} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Aplicar</button>
        {message && <span className="text-sm">{message}</span>}
      </div>
      {confirming && (
        <div className="rounded border border-yellow-700/40 bg-yellow-900/10 p-3 text-sm text-white">
          <p>¿Confirmás actualizar precios? Esto afectará a los productos seleccionados.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={apply} className="rounded bg-green-600 px-3 py-1 text-white">Confirmar</button>
            <button onClick={() => setConfirming(false)} className="rounded bg-neutral-800 px-3 py-1 text-white">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}


