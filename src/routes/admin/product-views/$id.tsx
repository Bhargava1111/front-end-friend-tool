import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { AnalyticsFiltersBar } from "@/components/admin/analytics-filters";
import { DEFAULT_ANALYTICS_FILTERS, type AnalyticsFilters } from "@/lib/admin-analytics";
import { getAdminProductViewDetail } from "@/lib/admin-ops.functions";
import { getAdminProductViewDetailClient } from "@/lib/admin-client.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/product-views/$id")({
  head: () => ({
    meta: [{ title: "Product analytics — Admin | Sri Mahalakshmi Stores" }],
  }),
  component: ProductViewDetailPage,
});

function ProductViewDetailPage() {
  const { id } = Route.useParams();
  const [filters, setFilters] = useState<AnalyticsFilters>({ ...DEFAULT_ANALYTICS_FILTERS, granularity: "day" });
  const fetchDetail = useAdminFn(getAdminProductViewDetail, getAdminProductViewDetailClient);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-product-view-detail", id, filters],
    queryFn: () =>
      fetchDetail({ data: { ...filters, id } }) as Promise<{
        product: string;
        total_views: number;
        unique_visitors: number;
        add_to_cart: number;
        purchases: number;
        conversion_rate: number;
        add_to_cart_rate: number;
        series: Array<{ period: string; views: number }>;
      }>,
  });

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/product-views" className="text-xs font-semibold text-primary">
          ← Product views
        </Link>
        <h1 className="mt-2 text-base font-semibold">{data?.product ?? "Product analytics"}</h1>
      </div>
      <AnalyticsFiltersBar value={filters} onChange={setFilters} showQuery={false} />
      <div className="flex flex-wrap gap-2">
        {(["day", "week", "month"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, granularity: g }))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
              filters.granularity === g
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            Views by {g}
          </button>
        ))}
      </div>
      {isLoading || !data ? (
        <div className="h-48 animate-pulse rounded-2xl bg-card" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Total views", data.total_views],
              ["Unique visitors", data.unique_visitors],
              ["Add to cart", data.add_to_cart],
              ["Purchases", data.purchases],
              ["Conversion rate", `${data.conversion_rate}%`],
              ["Add-to-cart rate", `${data.add_to_cart_rate}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke="#1F5136" fill="#1F513622" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
