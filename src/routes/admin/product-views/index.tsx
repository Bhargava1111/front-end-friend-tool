import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { AnalyticsFiltersBar } from "@/components/admin/analytics-filters";
import { DEFAULT_ANALYTICS_FILTERS, ADMIN_ANALYTICS_REFETCH_MS, type AnalyticsFilters, type ProductViewRow } from "@/lib/admin-analytics";
import { getAdminProductViewAnalytics } from "@/lib/admin-ops.functions";
import { getAdminProductViewAnalyticsClient } from "@/lib/admin-client.functions";

export const Route = createFileRoute("/admin/product-views/")({
  head: () => ({
    meta: [
      { title: "Product View Analytics — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Most viewed products, carts and purchases." },
    ],
  }),
  component: ProductViewsPage,
});

function ProductViewsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const fetchViews = useAdminFn(getAdminProductViewAnalytics, getAdminProductViewAnalyticsClient);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-product-views", filters],
    queryFn: () =>
      fetchViews({ data: filters }) as Promise<{
        rows: ProductViewRow[];
        total_rows: number;
        page: number;
        page_size: number;
      }>,
    refetchInterval: ADMIN_ANALYTICS_REFETCH_MS,
    staleTime: 5_000,
  });
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <Eye className="h-4 w-4" /> Product view analytics
        </h1>
        <p className="text-xs text-muted-foreground">Identify the most-viewed products and how they convert.</p>
      </div>
      <AnalyticsFiltersBar value={filters} onChange={setFilters} showQuery />
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-card" />
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Most viewed products</h2>
            <ol className="mt-3 space-y-2">
              {rows.slice(0, 8).map((row, i) => (
                <li key={row.product_id ?? row.product} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {i + 1}.{" "}
                    {row.product_id ? (
                      <Link
                        to="/admin/product-views/$id"
                        params={{ id: row.product_id }}
                        className="font-medium text-primary"
                      >
                        {row.product}
                      </Link>
                    ) : (
                      row.product
                    )}
                  </span>
                  <span className="text-muted-foreground">{row.views.toLocaleString()} views</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 text-right font-medium">Views</th>
                  <th className="px-4 py-3 text-right font-medium">Unique visitors</th>
                  <th className="px-4 py-3 text-right font-medium">Add to cart</th>
                  <th className="px-4 py-3 text-right font-medium">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.product_id ?? row.product} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      {row.product_id ? (
                        <Link to="/admin/product-views/$id" params={{ id: row.product_id }} className="text-primary">
                          {row.product}
                        </Link>
                      ) : (
                        row.product
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{row.unique_visitors.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{row.add_to_cart.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{row.purchases.toLocaleString()}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No product views in this range yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(data?.total_rows ?? 0) > (data?.page_size ?? 25) && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
