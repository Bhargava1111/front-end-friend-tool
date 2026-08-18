import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "@/lib/api";

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/home/");
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/categories/");
});

export const getCategoryWithProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    return apiFetch(`/categories/${data.slug}/products/`);
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
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
  });

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q?: string; category?: string; sort?: string; page?: number }) => data)
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.q) params.set("search", data.q);
    if (data.category) params.set("category", data.category);
    if (data.sort) params.set("sort", data.sort);
    if (data.page) params.set("page", String(data.page));
    const qs = params.toString();
    const res = await apiFetch<{ count?: number; results?: import("@/lib/types").Product[] } | import("@/lib/types").Product[]>(
      qs ? `/products/?${qs}` : "/products/",
    );
    if (Array.isArray(res)) return res;
    return res.results ?? [];
  });

export const getDeals = createServerFn({ method: "GET" })
  .inputValidator((data: { tab?: string; max_price?: number }) => data)
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.tab) params.set("tab", data.tab);
    if (data.max_price) params.set("max_price", String(data.max_price));
    const qs = params.toString();
    return apiFetch(`/catalog/deals/${qs ? `?${qs}` : ""}`);
  });

export const getCombos = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch<import("@/lib/types").Product[]>("/catalog/combos/");
});

export const getOffers = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/catalog/offers/");
});

export const getCoupons = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/coupons/");
});
