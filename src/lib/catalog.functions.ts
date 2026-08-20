import { apiFetch } from "@/lib/api";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";

export async function getHomeData() {
  try {
    const data = await apiFetch("/home/");
    writeOfflineCache("home", data);
    return data;
  } catch (error) {
    const home = readOfflineCache<Record<string, unknown>>("home");
    if (home) return { ...home, _offline: true };
    throw error;
  }
}

export async function getCategories() {
  return apiFetch("/categories/");
}

export async function getCategoryWithProducts({ data }: { data: { slug: string } }) {
  return apiFetch(`/categories/${data.slug}/products/`);
}

export async function getProductBySlug({ data }: { data: { slug: string } }) {
  const res = await apiFetch<
    import("@/lib/types").Product & {
      related?: import("@/lib/types").Product[];
      product?: import("@/lib/types").Product;
    }
  >(`/products/${data.slug}/`);
  if (res.product) {
    return { product: res.product, related: res.related ?? [] };
  }
  const { related = [], ...product } = res;
  return { product, related };
}

export async function searchProducts({
  data,
}: {
  data: { q?: string; category?: string; sort?: string; page?: number };
}) {
  const params = new URLSearchParams();
  if (data.q) params.set("search", data.q);
  if (data.category) params.set("category", data.category);
  if (data.sort) params.set("sort", data.sort);
  if (data.page) params.set("page", String(data.page));
  const qs = params.toString();
  const res = await apiFetch<
    { count?: number; results?: import("@/lib/types").Product[] } | import("@/lib/types").Product[]
  >(qs ? `/products/?${qs}` : "/products/");
  if (Array.isArray(res)) return res;
  return res.results ?? [];
}

export async function getDeals({ data }: { data: { tab?: string; max_price?: number } }) {
  const params = new URLSearchParams();
  if (data.tab) params.set("tab", data.tab);
  if (data.max_price) params.set("max_price", String(data.max_price));
  const qs = params.toString();
  return apiFetch(`/catalog/deals/${qs ? `?${qs}` : ""}`);
}

export async function getCombos() {
  return apiFetch<import("@/lib/types").Product[]>("/catalog/combos/");
}

export async function getOffers() {
  return apiFetch("/catalog/offers/");
}

export async function getCoupons() {
  return apiFetch("/coupons/");
}
