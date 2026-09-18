"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Star, Trash2, Plus } from 'lucide-react';
import { revalidateHome } from '@/lib/admin/revalidateHome';

type Review = { id: string; name: string; rating: number; text: string };

export default function AdminOpinionesPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'homepage_reviews')
        .maybeSingle();
      const list = (data?.value as Review[] | null) || [];
      setReviews(Array.isArray(list) ? list : []);
      setLoading(false);
    })();
  }, []);

  const persist = async (next: Review[]) => {
    setSaving(true);
    setMessage(null);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'homepage_reviews', value: next }, { onConflict: 'key' });
    if (error) {
      setMessage(`Error al guardar: ${error.message}`);
    } else {
      setMessage('✓ Opiniones guardadas');
      await revalidateHome();
    }
    setSaving(false);
  };

  const addReview = async () => {
    if (!name.trim() || !text.trim()) {
      setMessage('Completá nombre y opinión.');
      return;
    }
    const next = [
      ...reviews,
      { id: `${Date.now()}`, name: name.trim(), rating, text: text.trim() },
    ];
    setReviews(next);
    setName('');
    setText('');
    setRating(5);
    await persist(next);
  };

  const removeReview = async (id: string) => {
    const next = reviews.filter((r) => r.id !== id);
    setReviews(next);
    await persist(next);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opiniones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cargá las opiniones que se muestran (deslizándose) en la home: nombre, puntuación y texto.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          {message}
        </div>
      )}

      {/* Form nueva opinión */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Nueva opinión</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan P."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puntuación</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  aria-label={`${i} estrellas`}
                >
                  <Star
                    className={
                      i <= rating
                        ? 'w-7 h-7 fill-amber-400 text-amber-400'
                        : 'w-7 h-7 fill-gray-200 text-gray-200'
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opinión</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Escribí lo que dijo el cliente…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <button
          onClick={addReview}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-black uppercase tracking-tight text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar opinión
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">
          Opiniones cargadas {reviews.length > 0 && `(${reviews.length})`}
        </h2>
        {loading ? (
          <div className="text-sm text-gray-500">Cargando…</div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Todavía no hay opiniones. La sección no se muestra en la home hasta que cargues una.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">{r.name}</span>
                  <span className="flex items-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={
                          i <= r.rating
                            ? 'w-4 h-4 fill-amber-400 text-amber-400'
                            : 'w-4 h-4 fill-gray-200 text-gray-200'
                        }
                      />
                    ))}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{r.text}</p>
              </div>
              <button
                onClick={() => removeReview(r.id)}
                disabled={saving}
                className="shrink-0 p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                aria-label="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
