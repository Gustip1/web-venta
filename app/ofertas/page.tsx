import { OfertasClient } from '@/components/catalog/OfertasClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '🔥 Ofertas Especiales',
  description: 'Descubre nuestras ofertas especiales en sneakers y streetwear 100% originales.',
};

export default async function OfertasPage() {
  return (
    <>
      <OfertasClient />
    </>
  );
}

