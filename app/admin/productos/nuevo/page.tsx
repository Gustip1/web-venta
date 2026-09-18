"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';
import { VariantEditor } from '@/components/admin/VariantEditor';
import { slugify } from '@/lib/utils';
import { Brand, STREETWEAR_SUBCATEGORIES, StreetWearSubcategory } from '@/types/db';
import { revalidateHome } from '@/lib/admin/revalidateHome';

export default function NewProductPage() {
  const supabase = createBrowserClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'sneakers' | 'streetwear'>('sneakers');
  const [subcategory, setSubcategory] = useState<StreetWearSubcategory | ''>('');
  const [brand, setBrand] = useState('');
  const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<string>('');
  const [description, setDescription] = useState('Todos nuestros productos son 100% originales.');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [featuredSneakers, setFeaturedSneakers] = useState(false);
  const [featuredStreetwear, setFeaturedStreetwear] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [active, setActive] = useState(true);
  const [variants, setVariants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('brands').select('*').eq('active', true).order('name')
      .then(({ data }) => setBrandOptions((data || []) as Brand[]));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title) return setError('Título requerido');
    if (price < 0) return setError('Precio inválido');
    if (images.length === 0) return setError('Al menos una imagen');
    const baseSlug = slugify(title);
    let finalSlug = baseSlug;
    let attempt = 1;
    while (true) {
      const { data } = await supabase.from('products').select('id').eq('slug', finalSlug).maybeSingle();
      if (!data) break;
      attempt += 1;
      finalSlug = `${baseSlug}-${attempt}`;
    }

    const { data: product, error: pErr } = await supabase
      .from('products')
      .insert({ 
        title, 
        slug: finalSlug, 
        category, 
        subcategory: category === 'streetwear' && subcategory ? subcategory : null,
        price, 
        description, 
        images,
        sale_price: salePrice !== '' ? Number(salePrice) : null,
        brand: brand || null,
        featured_sneakers: featuredSneakers,
        featured_streetwear: featuredStreetwear,
        is_new: isNew,
        active
      })
      .select('*')
      .single();
    if (pErr) return setError(pErr.message);
    if (variants.length) {
      const toInsert = variants.map((v: any) => ({ product_id: product!.id, size: v.size, stock: Number(v.stock || 0) }));
      const { error: vErr } = await supabase.from('product_variants').insert(toInsert);
      if (vErr) return setError(vErr.message);
    }
    await revalidateHome();
    window.location.href = `/admin/productos/${product!.id}`;
  };

  return (
    <form onSubmit={save} className="space-y-4 text-black">
      <h1 className="text-2xl font-bold">Nuevo producto</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Título</label>
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Categoría</label>
              <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value={category} onChange={(e) => { setCategory(e.target.value as any); if (e.target.value !== 'streetwear') setSubcategory(''); }}>
                <option value="sneakers">Sneakers</option>
                <option value="streetwear">Streetwear</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Precio (USD)</label>
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Precio especial / Rebaja (USD) <span className="text-gray-400 font-normal">— opcional</span></label>
              <input className="mt-1 w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" type="number" min={0} placeholder="Dejar vacío si no hay rebaja" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              {salePrice !== '' && Number(salePrice) > 0 && Number(salePrice) < price && (
                <p className="text-xs text-red-600 font-bold mt-1">El precio original (${price}) se mostrará tachado → Rebaja: ${salePrice} USD</p>
              )}
            </div>
          </div>
          {category === 'streetwear' && (
            <div>
              <label className="block text-sm font-medium">Subcategoría</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value as StreetWearSubcategory | '')}
              >
                <option value="">— Sin subcategoría —</option>
                {STREETWEAR_SUBCATEGORIES.map((sub) => (
                  <option key={sub.value} value={sub.value}>
                    {sub.icon} {sub.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Marca</label>
            <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value={brand} onChange={e => setBrand(e.target.value)}>
              <option value="">— Sin marca —</option>
              {brandOptions.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featuredSneakers}
                onChange={(e) => setFeaturedSneakers(e.target.checked)}
              />{' '}
              Destacado Sneakers
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featuredStreetwear}
                onChange={(e) => setFeaturedStreetwear(e.target.checked)}
              />{' '}
              Destacado Streetwear
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
              />{' '}
              Nuevos ingresos
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />{' '}
              Activo
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Imágenes</label>
            <ImageUploader value={images} onChange={setImages} />
          </div>
          <div>
            <label className="block text-sm font-medium">Variantes (talles)</label>
            <VariantEditor value={variants as any} onChange={setVariants as any} />
          </div>
        </div>
      </div>
      <div>
        <button className="rounded bg-black px-4 py-2 text-sm font-medium text-white">Guardar</button>
      </div>
    </form>
  );
}


