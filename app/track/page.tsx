"use client";
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type OrderStatus = 'draft' | 'paid' | 'fulfilled' | 'cancelled';

interface LookupResult {
  order_number: string | null;
  status: OrderStatus | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  updated_at: string | null;
}

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none transition-colors";

export default function TrackPage() {
  const supabase = createBrowserClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await supabase.rpc('public_order_lookup', {
      p_order_number: orderNumber.trim(),
      p_email: email.trim()
    });
    if (err) {
      setError('No se pudo consultar el estado.');
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      setError('No se encontró una orden con esos datos.');
    } else {
      const row = Array.isArray(data) ? (data[0] as any) : (data as any);
      setResult({
        order_number: row.order_number ?? null,
        status: row.status ?? null,
        carrier: row.carrier ?? null,
        tracking_number: row.tracking_number ?? null,
        tracking_url: row.tracking_url ?? null,
        updated_at: row.updated_at ?? null
      });
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <h1 className="text-xl font-bold text-gray-900">Seguimiento de pedido</h1>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-gray-700">Número de orden</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="TK-202501-00001"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-gray-700">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputCls}
          />
        </div>
        <button
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60 transition-colors"
          onClick={lookup}
          disabled={loading || !orderNumber || !email}
        >
          {loading ? 'Buscando…' : 'Buscar pedido'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {[
            { label: 'Número de orden', value: result.order_number },
            { label: 'Estado', value: result.status },
            { label: 'Carrier', value: result.carrier },
            { label: 'Nro. tracking', value: result.tracking_number },
            { label: 'Última actualización', value: result.updated_at ? new Date(result.updated_at).toLocaleString() : null },
          ].filter(r => r.value).map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <span className="text-sm text-gray-500 font-bold">{label}</span>
              <span className="text-sm text-gray-900 font-bold">{value}</span>
            </div>
          ))}
          {result.tracking_url && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-bold">Tracking URL</span>
              <a className="text-sm text-blue-600 font-bold underline" href={result.tracking_url} target="_blank" rel="noreferrer">
                Seguir envío
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
