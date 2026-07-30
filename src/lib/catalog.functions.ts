import { createServerFn } from "@tanstack/react-start";
import { getPublicSupabase, PRODUCT_COLUMNS } from "./catalog.server";

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const [banners, categories, products] = await Promise.all([
    supabase.from("banners").select("id, title, subtitle, image_url, link_slug").order("sort_order"),
    supabase
      .from("categories")
      .select("id, name, slug, description, image_url")
      .order("sort_order"),
    supabase.from("products").select(PRODUCT_COLUMNS).order("created_at", { ascending: false }),
  ]);

  const all = products.data ?? [];
  return {
    banners: banners.data ?? [],
    categories: categories.data ?? [],
    featured: all.filter((p) => p.is_featured).slice(0, 10),
    bestSelling: all.filter((p) => p.is_best_seller).slice(0, 10),
    newest: all.slice(0, 10),
    recommended: all.filter((p) => p.is_recommended).slice(0, 10),
  };
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .order("sort_order");
  return data ?? [];
});

export const getCategoryWithProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: category } = await supabase
      .from("categories")
      .select("id, name, slug, description, image_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!category) return { category: null, products: [] };
    const { data: products } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("category_id", category.id)
      .order("name");
    return { category, products: products ?? [] };
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: product } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (!product) return { product: null, related: [], categoryName: null };

    const [{ data: related }, { data: category }, { data: gallery }] = await Promise.all([
      product.category_id
        ? supabase
            .from("products")
            .select(PRODUCT_COLUMNS)
            .eq("category_id", product.category_id)
            .neq("id", product.id)
            .limit(8)
        : Promise.resolve({ data: [] as typeof product[] }),
      product.category_id
        ? supabase.from("categories").select("name, slug").eq("id", product.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("product_images")
        .select("image_url, sort_order")
        .eq("product_id", product.id)
        .order("sort_order"),
    ]);

    const images = [
      ...(product.image_url ? [product.image_url] : []),
      ...(gallery ?? []).map((g) => g.image_url),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    return { product, related: related ?? [], categoryName: category?.name ?? null, images };
  });

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string; sort?: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    let query = supabase.from("products").select(PRODUCT_COLUMNS);
    if (data.q.trim()) query = query.ilike("name", `%${data.q.trim()}%`);
    if (data.sort === "price_asc") query = query.order("price", { ascending: true });
    else if (data.sort === "price_desc") query = query.order("price", { ascending: false });
    else query = query.order("name");
    const { data: products } = await query.limit(60);
    return products ?? [];
  });
