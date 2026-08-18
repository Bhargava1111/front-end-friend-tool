export type ProductVariant = {
  id: string;
  product_id?: string | null;
  label: string;
  unit: string;
  unit_value: number;
  price: number;
  mrp: number | null;
  stock: number;
  sku?: string | null;
  image_url?: string | null;
  is_default: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  weight: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  image_url: string | null;
  video_url?: string | null;
  is_featured: boolean;
  is_best_seller: boolean;
  is_recommended: boolean;
  category_id: string | null;
  brand_id?: string | null;
  benefits?: string[] | null;
  shelf_life?: string | null;
  origin?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  /** Main image first, then gallery images from product_images. */
  images?: string[];
  /** Active pack sizes, cheapest-first by sort order. */
  variants?: ProductVariant[];
  /** Admin qty price breaks: [{ min_qty, max_qty, unit_price }, ...] */
  price_tiers?: Array<{
    min_qty: number;
    max_qty: number;
    unit_price: number;
  }> | null;
  is_combo?: boolean;
  combo_items?: Array<{
    product_id: string;
    quantity: number;
    name?: string;
    image_url?: string | null;
    price?: number;
  }>;
};


export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id?: string | null;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_slug: string | null;
  placement?: string;
  sort_order?: number;
  is_active?: boolean;
  product_id?: string | null;
  product?: Product | null;
};

export type CartLine = {
  id: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
};


export type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
};

export type OrderStatus = "pending" | "confirmed" | "packed" | "delivered" | "cancelled";

export type OrderItem = {
  id: string;
  product_name: string;
  product_weight: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount?: number;
  tax?: number;
  coupon_code?: string | null;
  payment_method?: string | null;
  delivery_slot?: string | null;
  delivery_date?: string | null;
  total: number;
  recipient_name: string;
  phone: string;
  address_text: string;
  created_at: string;
  order_items?: OrderItem[];
};


export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  avatar_url: string | null;
  gst_number: string | null;
};
