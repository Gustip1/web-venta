"use client";
import { useState } from 'react';
import { ProductVariant } from '@/types/db';

export function VariantEditor({
  value,
  onChange
}: {
  value: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
}) {
  const [rows, setRows] = useState<ProductVariant[]>(value);
  const commit = (next: ProductVariant[]) => {
    setRows(next);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_120px_80px] items-center gap-2 text-xs font-medium text-neutral-300">
        <div>Talle</div>
        <div>Stock</div>
        <div></div>
      </div>
      {rows.map((r, idx) => (
        <div key={r.id || idx} className="grid grid-cols-[1fr_120px_80px] items-center gap-2">
          <input
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white placeholder-neutral-400"
            value={r.size}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...next[idx], size: e.target.value };
              commit(next);
            }}
            placeholder="42 / M / XL"
          />
          <input
            type="number"
            min={0}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white"
            value={r.stock}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...next[idx], stock: Number(e.target.value) };
              commit(next);
            }}
          />
          <button
            type="button"
            className="rounded bg-red-600/10 px-2 py-1 text-xs text-red-400 hover:bg-red-600/20"
            onClick={() => commit(rows.filter((_, i) => i !== idx))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-neutral-900 px-3 py-2 text-xs font-medium text-white"
        onClick={() => commit([...rows, { id: crypto.randomUUID(), product_id: '', size: '', stock: 0 }])}
      >
        Agregar variante
      </button>
    </div>
  );
}


