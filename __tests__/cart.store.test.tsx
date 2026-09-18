import { describe, it, expect } from 'vitest';
import { useCartStore } from '@/store/cart';

describe('cart store', () => {
  it('adds, updates and removes items', () => {
    const { addItem, updateQty, removeItem, clear, items } = useCartStore.getState();
    clear();
    addItem({ productId: 'p1', slug: 'x', title: 'Test', price: 100, imageUrl: null, size: 'M' }, 2);
    expect(useCartStore.getState().items).toHaveLength(1);
    updateQty('p1', 'M', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    removeItem('p1', 'M');
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});


