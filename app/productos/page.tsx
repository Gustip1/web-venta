import { ProductsClient } from '@/components/catalog/ProductsClient';
import { STREETWEAR_SUBCATEGORIES, StreetWearSubcategory } from '@/types/db';

export const dynamic = 'force-dynamic';

const validSubcategories: string[] = STREETWEAR_SUBCATEGORIES.map((s) => s.value);

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  const subParam = typeof searchParams?.sub === 'string' ? searchParams.sub : undefined;
  const subcategory = subParam && validSubcategories.includes(subParam) ? (subParam as StreetWearSubcategory) : undefined;
  const brand = typeof searchParams?.brand === 'string' ? searchParams.brand : undefined;
  return (
    <>
      <ProductsClient category={category as any} subcategory={subcategory} brand={brand} />
    </>
  );
}


