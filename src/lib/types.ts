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
  is_featured: boolean;
  is_best_seller: boolean;
  is_recommended: boolean;
  category_id: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_slug: string | null;
};

export type CartLine = {
  id: string;
  quantity: number;
  product: Product;
};

export type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
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
  total: number;
  recipient_name: string;
  phone: string;
  address_text: string;
  created_at: string;
  order_items?: OrderItem[];
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};
