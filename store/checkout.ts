import { create } from 'zustand';

export type Fulfillment = 'pickup' | 'shipping';
export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export interface AppliedDiscount {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  amount: number;
}

export interface CheckoutState {
  orderId: string | null;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod | null;
  appliedDiscount: AppliedDiscount | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    document: string;
  };
  address: {
    street: string;
    number: string;
    unit: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  };
  setFulfillment: (f: Fulfillment) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  updateContact: (p: Partial<CheckoutState['contact']>) => void;
  updateAddress: (p: Partial<CheckoutState['address']>) => void;
  setOrderId: (id: string) => void;
  setAppliedDiscount: (d: AppliedDiscount | null) => void;
  reset: () => void;
}

const initial: Omit<CheckoutState, 'setFulfillment' | 'setPaymentMethod' | 'updateContact' | 'updateAddress' | 'setOrderId' | 'setAppliedDiscount' | 'reset'> = {
  orderId: null,
  fulfillment: 'pickup',
  paymentMethod: null,
  appliedDiscount: null,
  contact: { firstName: '', lastName: '', email: '', phone: '', document: '' },
  address: { street: '', number: '', unit: '', city: '', province: '', postalCode: '', notes: '' }
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initial,
  setFulfillment: (f) => set({ fulfillment: f, paymentMethod: null }),
  setPaymentMethod: (m) => set({ paymentMethod: m }),
  updateContact: (p) => set((s) => ({ contact: { ...s.contact, ...p } })),
  updateAddress: (p) => set((s) => ({ address: { ...s.address, ...p } })),
  setOrderId: (id) => set({ orderId: id }),
  setAppliedDiscount: (d) => set({ appliedDiscount: d }),
  reset: () => set(initial)
}));


