export type ProductCategory = 'sneakers' | 'streetwear';

export type StreetWearSubcategory =
  | 'remeras'
  | 'longsleeves'
  | 'hoodies'
  | 'puffers'
  | 'conjuntos'
  | 'pantalones'
  | 'accesorios';

/**
 * Las subcategorías de streetwear, en el orden en que se muestran.
 *
 * Única fuente de verdad: el formulario de productos, los filtros del catálogo
 * y las categorías de la portada la leen de acá. Para agregar una nueva,
 * sumala a la lista y al tipo de arriba; no hace falta tocar la base de datos,
 * `products.subcategory` es texto libre.
 */
export const STREETWEAR_SUBCATEGORIES: { value: StreetWearSubcategory; label: string; icon: string }[] = [
  { value: 'remeras', label: 'Remeras', icon: '👕' },
  { value: 'longsleeves', label: 'Longsleeves', icon: '👕' },
  { value: 'hoodies', label: 'Hoodies / Zip hoodies', icon: '🧥' },
  { value: 'puffers', label: 'Puffers', icon: '🧥' },
  { value: 'conjuntos', label: 'Conjuntos', icon: '🩱' },
  { value: 'pantalones', label: 'Pantalones', icon: '👖' },
  { value: 'accesorios', label: 'Accesorios', icon: '🧢' },
];

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  subcategory: StreetWearSubcategory | null;
  brand?: string | null;
  price: number;
  sale_price?: number | null;
  description: string | null;
  images: ProductImage[];
  featured_sneakers: boolean;
  featured_streetwear: boolean;
  on_sale: boolean;
  /** Flag para controlar manualmente si aparece en "Nuevos ingresos" */
  is_new?: boolean | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Joined from product_variants when using select('*, product_variants(stock,size)') */
  product_variants?: { stock: number; size?: string }[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
}

/* ────────────── Orders ────────────── */

export type OrderStatus = 'draft' | 'paid' | 'fulfilled' | 'cancelled';
export type FulfillmentMethod = 'pickup' | 'shipping';
export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export interface Order {
  id: string;
  user_id: string | null;
  order_number: string | null;
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  payment_method: PaymentMethod | string | null;
  payment_status: string | null;
  payment_alias: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

export interface ShippingAddress {
  id: string;
  order_id: string;
  street: string | null;
  number: string | null;
  unit: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
}



