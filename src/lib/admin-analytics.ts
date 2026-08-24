export type AnalyticsPreset = "today" | "yesterday" | "7d" | "30d" | "custom";
export type AnalyticsVisitor = "all" | "guest" | "logged_in";

export type AnalyticsFilters = {
  preset: AnalyticsPreset;
  from?: string;
  to?: string;
  product?: string;
  category?: string;
  brand?: string;
  query?: string;
  user?: string;
  visitor: AnalyticsVisitor;
  page?: number;
  page_size?: number;
  granularity?: "day" | "week" | "month";
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  preset: "30d",
  visitor: "all",
  page: 1,
  page_size: 25,
};

export function analyticsQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  params.set("preset", filters.preset);
  if (filters.preset === "custom" && filters.from) params.set("from", filters.from);
  if (filters.preset === "custom" && filters.to) params.set("to", filters.to);
  if (filters.product?.trim()) params.set("product", filters.product.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.brand?.trim()) params.set("brand", filters.brand.trim());
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.user?.trim()) params.set("user", filters.user.trim());
  if (filters.visitor && filters.visitor !== "all") params.set("visitor", filters.visitor);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.granularity) params.set("granularity", filters.granularity);
  return params.toString();
}

export type SearchAnalyticsResponse = {
  preset: string;
  from: string;
  to: string;
  kpis: {
    total_searches: number;
    unique_searches: number;
    today_searches: number;
    zero_result_searches: number;
    top_search_query: string;
    search_to_click_rate: number;
    search_to_purchase_rate: number;
  };
  rows: Array<{
    query: string;
    query_normalized: string;
    searches: number;
    results: number;
    product_clicks: number;
    purchases: number;
  }>;
  page: number;
  page_size: number;
  total_rows: number;
};

export type ProductViewRow = {
  product_id: string | null;
  product: string;
  views: number;
  unique_visitors: number;
  add_to_cart: number;
  purchases: number;
};

export type FunnelResponse = {
  stages: Array<{ key: string; label: string; count: number }>;
  conversions: Array<{ from: string; to: string; rate: number }>;
  overall_search_to_purchase: number;
  overall_view_to_purchase: number;
};
