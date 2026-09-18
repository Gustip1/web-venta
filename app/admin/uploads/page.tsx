"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';

export default function AdminUploadsPage() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, title, images')
      .order('title', { ascending: true })
      .limit(200)
      .then(({ data }) => setProducts((data || []) as any));
  }, [supabase]);

  useEffect(() => {
    const p = products.find((p) => p.id === selected);
    if (p) setImages((p.images || []) as any);
    else setImages([]);
  }, [selected, products]);

  const save = async () => {
    setMsg(null);
    if (!selected) return;
    const { error } = await supabase.from('products').update({ images }).eq('id', selected);
    setMsg(error ? error.message : 'Guardado');
  };

  const move = (index: number, delta: number) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setImages(next);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Uploads de imágenes</h1>
      <div className="max-w-xl">
        <label className="block text-sm font-medium text-white">Producto</label>
        <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Seleccionar...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="space-y-3">
          <ImageUploader value={images} onChange={setImages} />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {images.map((img, idx) => (
              <div key={img.url} className="rounded border border-neutral-800 p-2 text-sm">
                <div className="truncate text-white">{img.url}</div>
                <div className="mt-2 flex gap-2">
                  <button className="rounded bg-neutral-800 px-3 py-1 text-xs text-white" onClick={() => move(idx, -1)}>
                    ↑
                  </button>
                  <button className="rounded bg-neutral-800 px-3 py-1 text-xs text-white" onClick={() => move(idx, 1)}>
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              Guardar
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}


