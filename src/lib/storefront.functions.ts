import { apiFetch } from "@/lib/api";
import { DEFAULT_SETTINGS, type StoreSettings } from "./commerce";

export async function getStorefrontMeta() {
  const [brands, coupons] = await Promise.all([
    apiFetch<{ brands?: unknown[] }>("/catalog/brands/directory/").then((d) => d.brands ?? []),
    apiFetch<unknown[]>("/coupons/"),
  ]);

  return {
    settings: { ...DEFAULT_SETTINGS } as StoreSettings,
    brands,
    coupons,
  };
}

export async function getPlacementBanners({
  data,
}: {
  data: { placement: "home" | "offers" | "coupons" | "brands" | "combos" };
}) {
  return apiFetch(`/banners/?placement=${data.placement}`);
}

export async function getProductReviews({ data }: { data: { productId: string } }) {
  const list = await apiFetch<Array<{ rating: number }>>(`/products/${data.productId}/reviews/`);
  const average = list.length
    ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
    : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: list.filter((r) => r.rating === star).length,
  }));
  return { reviews: list, average, total: list.length, distribution };
}

export async function getBrandDirectory() {
  return apiFetch("/catalog/brands/directory/");
}
