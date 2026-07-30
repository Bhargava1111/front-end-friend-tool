import { createServerFn } from "@tanstack/react-start";
import { getPublicSupabase } from "./catalog.server";
import { DEFAULT_SETTINGS, type StoreSettings } from "./commerce";

export const getStorefrontMeta = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const [settings, brands, coupons] = await Promise.all([
    supabase.from("app_settings").select("key, value"),
    supabase
      .from("brands")
      .select("id, name, slug, tagline, logo_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("coupons")
      .select(
        "id, code, title, description, discount_type, discount_value, min_order, max_discount, is_active, starts_at, ends_at",
      )
      .eq("is_active", true)
      .order("min_order"),
  ]);

  const resolved: StoreSettings = { ...DEFAULT_SETTINGS };
  for (const row of settings.data ?? []) {
    (resolved as unknown as Record<string, unknown>)[row.key] = row.value as unknown;
  }

  return {
    settings: resolved,
    brands: brands.data ?? [],
    coupons: coupons.data ?? [],
  };
});

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: reviews } = await supabase
      .from("reviews")
      .select("id, rating, title, body, image_url, author_name, created_at")
      .eq("product_id", data.productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = reviews ?? [];
    const average = list.length
      ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: list.filter((r) => r.rating === star).length,
    }));
    return { reviews: list, average, total: list.length, distribution };
  });
