import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "@/lib/api";
import { DEFAULT_SETTINGS, type StoreSettings } from "./commerce";

export const getStorefrontMeta = createServerFn({ method: "GET" }).handler(async () => {
  const [brands, coupons] = await Promise.all([
    apiFetch<unknown[]>("/catalog/brands/directory/").then((d) => (d as { brands: unknown[] }).brands ?? []),
    apiFetch<unknown[]>("/coupons/"),
  ]);

  return {
    settings: { ...DEFAULT_SETTINGS } as StoreSettings,
    brands,
    coupons,
  };
});

export const getPlacementBanners = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { placement: "home" | "offers" | "coupons" | "brands" | "combos" }) => data,
  )
  .handler(async ({ data }) => {
    return apiFetch(`/banners/?placement=${data.placement}`);
  });

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data }) => {
    const list = await apiFetch<Array<{ rating: number }>>(`/products/${data.productId}/reviews/`);
    const average = list.length
      ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: list.filter((r) => (r as { rating: number }).rating === star).length,
    }));
    return { reviews: list, average, total: list.length, distribution };
  });

export const getBrandDirectory = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/catalog/brands/directory/");
});
