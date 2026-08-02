import { createServerFn } from "@tanstack/react-start";
import { attachGalleries, getPublicSupabase, PRODUCT_COLUMNS } from "./catalog.server";
import { DEFAULT_SETTINGS, type StoreSettings } from "./commerce";

export const getStorefrontMeta = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const [settings, brands, coupons] = await Promise.all([
    supabase.from("app_settings").select("key, value"),
    supabase
      .from("brands")
      .select("id, name, slug, tagline, logo_url, banner_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("coupons")
      .select(
        "id, code, title, description, discount_type, discount_value, min_order, max_discount, is_active, starts_at, ends_at, banner_url",
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

export const getPlacementBanners = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { placement: "home" | "offers" | "coupons" | "brands" | "combos" }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: rows } = await supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_slug, placement, brand_id, coupon_id")
      .eq("is_active", true)
      .eq("placement", data.placement)
      .order("sort_order");
    return rows ?? [];
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

export const getBrandDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const [{ data: brands }, { data: products }, { data: banners }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, slug, tagline, logo_url, banner_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_slug, brand_id")
      .eq("is_active", true)
      .eq("placement", "brands")
      .order("sort_order"),
  ]);
  const all = await attachGalleries(supabase, products ?? []);
  const banderList = banners ?? [];
  return {
    banners: banderList.filter((b) => !b.brand_id),
    brands: (brands ?? []).map((b) => ({
      ...b,
      banner_url:
        b.banner_url ?? banderList.find((x) => x.brand_id === b.id)?.image_url ?? null,
      products: all.filter((p) => p.brand_id === b.id).slice(0, 10),
    })),
  };
});
