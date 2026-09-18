import { createServerSupabase } from '@/lib/supabase/server';
import { Product } from '@/types/db';
import { ProductCard } from '@/components/catalog/ProductCard';
import Link from 'next/link';


export const metadata = {
  title: 'Nuevos ingresos',
};

export default async function NuevosIngresosPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('products')
    .select('*, product_variants(stock,size)')
    .eq('active', true)
    .eq('is_new', true)
    .order('created_at', { ascending: false });

  const products = (data ?? []) as Product[];

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
            Catálogo exclusivo
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
            Nuevos ingresos
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-bold max-w-2xl">
            Acá encontrás todos los productos que llegaron hace poco, ordenados del más reciente al más antiguo.
          </p>
        </header>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600 font-bold">
              Todavía no hay productos nuevos cargados. Volvé a chequear en unos días.
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center justify-center mt-4 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-colors uppercase tracking-tight"
            >
              Ver catálogo general
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


