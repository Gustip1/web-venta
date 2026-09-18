import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const products = [
    {
      title: 'Nike Air Max 97',
      slug: 'nike-air-max-97',
      category: 'sneakers',
      price: 199999,
      description: 'Clásico diseño con amortiguación Air.',
      images: [
        { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800', alt: 'Nike Air Max 97' }
      ],
      featured_sneakers: true
    },
    {
      title: 'Hoodie Essentials',
      slug: 'hoodie-essentials',
      category: 'streetwear',
      price: 89999,
      description: 'Buzo premium, ideal para todos los días.',
      images: [
        { url: 'https://images.unsplash.com/photo-1520975922203-b216dc3f0c3a?q=80&w=800', alt: 'Hoodie Essentials' }
      ],
      featured_streetwear: true
    }
  ];

  for (const p of products) {
    const { data, error } = await supabase.from('products').upsert(p).select('*').single();
    if (error) throw error;
    const prodId = data!.id as string;
    const variants = p.category === 'sneakers'
      ? [
          { product_id: prodId, size: '40', stock: 3 },
          { product_id: prodId, size: '41', stock: 2 },
          { product_id: prodId, size: '42', stock: 1 }
        ]
      : [
          { product_id: prodId, size: 'S', stock: 5 },
          { product_id: prodId, size: 'M', stock: 4 },
          { product_id: prodId, size: 'L', stock: 3 }
        ];
    const { error: vErr } = await supabase.from('product_variants').upsert(variants);
    if (vErr) throw vErr;
  }

  console.log('Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


