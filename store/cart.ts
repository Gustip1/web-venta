import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product, ProductVariant } from '@/types/db';

const CART_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string | null;
  size: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Timestamp (ms) when cart will expire. null = no timer running */
  expiresAt: number | null;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string, size: string) => void;
  updateQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  /** Check if timer expired and clear items if so. Returns true if expired. */
  checkExpiry: () => boolean;
  /** Get remaining seconds, or null if no timer */
  getRemainingSeconds: () => number | null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      expiresAt: null,
      addItem: (item, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex(
            (it) => it.productId === item.productId && it.size === item.size
          );
          const items = [...state.items];
          if (idx >= 0) {
            items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
          } else {
            items.push({ ...item, quantity: qty });
          }
          // Start or reset the 2-minute timer whenever an item is added
          return { items, expiresAt: Date.now() + CART_EXPIRY_MS };
        }),
      removeItem: (productId, size) =>
        set((state) => {
          const newItems = state.items.filter((it) => !(it.productId === productId && it.size === size));
          return {
            items: newItems,
            expiresAt: newItems.length > 0 ? state.expiresAt : null,
          };
        }),
      updateQty: (productId, size, qty) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.productId === productId && it.size === size
              ? { ...it, quantity: Math.max(1, qty) }
              : it
          )
        })),
      clear: () => set({ items: [], expiresAt: null }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      checkExpiry: () => {
        const { expiresAt, items } = get();
        if (!expiresAt || items.length === 0) return false;
        if (Date.now() >= expiresAt) {
          set({ items: [], expiresAt: null });
          return true;
        }
        return false;
      },
      getRemainingSeconds: () => {
        const { expiresAt, items } = get();
        if (!expiresAt || items.length === 0) return null;
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        return remaining;
      },
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => localStorage)
    }
  )
);



