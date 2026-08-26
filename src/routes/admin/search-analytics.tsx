import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { AnalyticsFiltersBar } from "@/components/admin/analytics-filters";
import { DEFAULT_ANALYTICS_FILTERS, ADMIN_ANALYTICS_REFETCH_MS, type AnalyticsFilters, type SearchAnalyticsResponse } from "@/lib/admin-analytics";
import {
  getAdminSearchAnalytics,
  getAdminSearchQueryDetail,
  getAdminZeroResultSearches,
} from "@/lib/admin-ops.functions";
import {
  getAdminSearchAnalyticsClient,
  getAdminSearchQueryDetailClient,
  getAdminZeroResultSearchesClient,
} from "@/lib/admin-client.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/search-analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Search Analytics — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Search queries, clicks and purchases." },
    ],
  }),
  component: SearchAnalyticsPage,
});

function SearchAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [selectedQuery, setSelectedQuery] = useState("");
  const fetchSearches = useAdminFn(getAdminSearchAnalytics, getAdminSearchAnalyticsClient);
  const fetchZeros = useAdminFn(getAdminZeroResultSearches, getAdminZeroResultSearchesClient);
  const fetchDetail = useAdminFn(getAdminSearchQueryDetail, getAdminSearchQueryDetailClient);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-search-analytics", filters],
    queryFn: () => fetchSearches({ data: filters }) as Promise<SearchAnalyticsResponse>,
    refetchInterval: ADMIN_ANALYTICS_REFETCH_MS,
    staleTime: 5_000,
    retry: 1,
    throwOnError: false,
  });
  const {
    data: zeros,
    isError: zerosError,
    error: zerosErr,
    refetch: refetchZeros,
  } = useQuery({
    queryKey: ["admin-zero-searches", filters],
    queryFn: () =>
      fetchZeros({ data: filters }) as Promise<{ rows: Array<{ query: string; searches: number }> }>,
    refetchInterval: ADMIN_ANALYTICS_REFETCH_MS,
    staleTime: 5_000,
    retry: 1,
    throwOnError: false,
  });
  const detailFilters = useMemo(
    () => ({ ...filters, query: selectedQuery }),
    [filters, selectedQuery],
  );
  const { data: detail } = useQuery({
    queryKey: ["admin-search-query", detailFilters],
    queryFn: () =>
      fetchDetail({ data: detailFilters }) as Promise<{
        query: string;
        searches: number;
        top_viewed_products: Array<{ product_id: string | null; product_name: string; views: number }>;
      }>,
    enabled: selectedQuery.length > 1,
    refetchInterval: ADMIN_ANALYTICS_REFETCH_MS,
    staleTime: 5_000,
    retry: 1,
    throwOnError: false,
  });

  const kpis = data?.kpis;
  const cards = [
    { label: "Total searches", value: kpis?.total_searches ?? 0 },
    { label: "Unique searches", value: kpis?.unique_searches ?? 0 },
    { label: "Today's searches", value: kpis?.today_searches ?? 0 },
    { label: "Zero-result", value: kpis?.zero_result_searches ?? 0 },
    { label: "Top query", value: kpis?.top_search_query || "—" },
    { label: "Search → click", value: `${kpis?.search_to_click_rate ?? 0}%` },
    { label: "Search → purchase", value: `${kpis?.search_to_purchase_rate ?? 0}%` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold">
            <Search className="h-4 w-4" /> Search analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Which searches convert into clicks and orders. Auto-refreshes every 15s.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
      <AnalyticsFiltersBar value={filters} onChange={setFilters} />
      {isError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load search analytics</p>
          <p className="mt-1 text-xs text-muted-foreground">{(error as Error)?.message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className="mt-1 truncate text-lg font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Search</th>
              <th className="px-4 py-3 text-right font-medium">Searches</th>
              <th className="px-4 py-3 text-right font-medium">Results</th>
              <th className="px-4 py-3 text-right font-medium">Product clicks</th>
              <th className="px-4 py-3 text-right font-medium">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row) => (
              <tr
                key={row.query_normalized}
                className={cn(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-secondary/50",
                  selectedQuery === row.query_normalized && "bg-primary-soft",
                )}
                onClick={() => setSelectedQuery(row.query_normalized)}
              >
                <td className="px-4 py-2.5 font-medium">{row.query}</td>
                <td className="px-4 py-2.5 text-right">{row.searches}</td>
                <td className="px-4 py-2.5 text-right">{row.results}</td>
                <td className="px-4 py-2.5 text-right">{row.product_clicks}</td>
                <td className="px-4 py-2.5 text-right">{row.purchases}</td>
              </tr>
            ))}
            {!data?.rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No searches in this range yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.total_rows > (data.page_size || 25) && (
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

      {detail && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Search → product views</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            “{detail.query}” · {detail.searches} searches
          </p>
          <ol className="mt-3 space-y-2">
            {detail.top_viewed_products.map((p) => (
              <li key={p.product_id ?? p.product_name} className="flex justify-between text-sm">
                {p.product_id ? (
                  <Link to="/admin/product-views/$id" params={{ id: p.product_id }} className="font-medium text-primary">
                    {p.product_name}
                  </Link>
                ) : (
                  <span>{p.product_name}</span>
                )}
                <span className="text-muted-foreground">{p.views} views</span>
              </li>
            ))}
            {!detail.top_viewed_products.length && (
              <p className="text-xs text-muted-foreground">No product views linked to this query.</p>
            )}
          </ol>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Zero-result searches</h2>
            <p className="mt-1 text-xs text-muted-foreground">Demand with no matching catalogue items.</p>
          </div>
          {zerosError && (
            <button
              type="button"
              onClick={() => void refetchZeros()}
              className="rounded-full border border-border px-3 py-1 text-xs"
            >
              Retry
            </button>
          )}
        </div>
        {zerosError ? (
          <p className="mt-3 text-xs text-muted-foreground">{(zerosErr as Error)?.message}</p>
        ) : (
        <ul className="mt-3 space-y-2">
          {(zeros?.rows ?? []).map((row) => (
            <li key={row.query} className="flex justify-between text-sm">
              <span className="font-medium">“{row.query}”</span>
              <span className="text-muted-foreground">{row.searches} searches</span>
            </li>
          ))}
          {!zeros?.rows?.length && (
            <p className="text-xs text-muted-foreground">No zero-result searches in this range.</p>
          )}
        </ul>
        )}
      </section>
    </div>
  );
}
