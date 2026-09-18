import type { MetadataRoute } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('products').select('slug').eq('active', true).limit(500);
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const items = (data || []).map((p) => ({ url: `${base}/producto/${p.slug}` }));
  return [
    { url: `${base}/` },
    { url: `${base}/productos?sneakers` },
    { url: `${base}/productos?streetwear` },
    { url: `${base}/encargos` },
    { url: `${base}/nosotros` },
    ...items
  ];
}


