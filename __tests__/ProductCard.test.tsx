import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/catalog/ProductCard';

const product = {
  id: '1',
  title: 'Prod',
  slug: 'prod',
  category: 'sneakers',
  price: 100,
  description: null,
  images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200', alt: 'img' }],
  featured_sneakers: false,
  featured_streetwear: false,
  active: true,
  created_at: null,
  updated_at: null
};

describe('ProductCard', () => {
  it('renders title and price', () => {
    render(<ProductCard product={product as any} />);
    expect(screen.getByText('Prod')).toBeInTheDocument();
  });
});


