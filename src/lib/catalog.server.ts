import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function getPublicSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const PRODUCT_COLUMNS =
  "id, name, slug, description, weight, price, mrp, stock, image_url, video_url, is_featured, is_best_seller, is_recommended, category_id, brand_id, benefits, shelf_life, origin, rating, rating_count";

export const VARIANT_COLUMNS =
  "id, product_id, label, unit, unit_value, price, mrp, stock, sku, image_url, is_default, is_active, sort_order";

type WithId = { id: string };

/** Adds an `variants` array (active pack sizes) to each product. */
export async function attachVariants<T extends WithId>(
  supabase: ReturnType<typeof getPublicSupabase>,
  products: T[],
) {
  if (products.length === 0) return [] as Array<T & { variants: Variant[] }>;
  const { data } = await supabase
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .in(
      "product_id",
      products.map((p) => p.id),
    )
    .eq("is_active", true)
    .order("sort_order");

  const map = new Map<string, Variant[]>();
  for (const row of (data ?? []) as Variant[]) {
    const list = map.get(row.product_id!) ?? [];
    list.push(row);
    map.set(row.product_id!, list);
  }
  return products.map((p) => ({ ...p, variants: map.get(p.id) ?? [] }));
}

type Variant = {
  id: string;
  product_id: string | null;
  label: string;
  unit: string;
  unit_value: number;
  price: number;
  mrp: number | null;
  stock: number;
  sku: string | null;
  image_url: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
};

type WithMedia = { id: string; image_url: string | null };


/** Adds an `images` array (main image + product_images gallery) to each product. */
export async function attachGalleries<T extends WithMedia>(
  supabase: ReturnType<typeof getPublicSupabase>,
  products: T[],
): Promise<Array<T & { images: string[] }>> {
  if (products.length === 0) return [];
  const { data } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in(
      "product_id",
      products.map((p) => p.id),
    )
    .order("sort_order");

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.product_id) ?? [];
    list.push(row.image_url);
    map.set(row.product_id, list);
  }

  return products.map((p) => {
    const all = [...(p.image_url ? [p.image_url] : []), ...(map.get(p.id) ?? [])];
    return { ...p, images: all.filter((v, i, arr) => arr.indexOf(v) === i) };
  });
}
