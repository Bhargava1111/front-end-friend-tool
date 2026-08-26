import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { AnalyticsFiltersBar } from "@/components/admin/analytics-filters";
import { DEFAULT_ANALYTICS_FILTERS, ADMIN_ANALYTICS_REFETCH_MS, type AnalyticsFilters, type FunnelResponse } from "@/lib/admin-analytics";
import { getAdminCustomerBehavior } from "@/lib/admin-ops.functions";
import { getAdminCustomerBehaviorClient } from "@/lib/admin-client.functions";

export const Route = createFileRoute("/admin/customer-behavior")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customer Behavior — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Search to purchase funnel." },
    ],
  }),
  component: CustomerBehaviorPage,
});

function CustomerBehaviorPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const fetchFunnel = useAdminFn(getAdminCustomerBehavior, getAdminCustomerBehaviorClient);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-behavior", filters],
    queryFn: () => fetchFunnel({ data: filters }) as Promise<FunnelResponse>,
    refetchInterval: ADMIN_ANALYTICS_REFETCH_MS,
    staleTime: 5_000,
    retry: 1,
    throwOnError: false,
  });
  const max = Math.max(...(data?.stages?.map((s) => s.count) ?? [1]), 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <GitBranch className="h-4 w-4" /> Customer behavior
        </h1>
        <p className="text-xs text-muted-foreground">How shoppers move from search to purchase.</p>
      </div>
      <AnalyticsFiltersBar value={filters} onChange={setFilters} />
      {isError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load behavior analytics</p>
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
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mx-auto max-w-md space-y-0">
            {data.stages.map((stage, i) => (
              <div key={stage.key} className="text-center">
                <div
                  className="mx-auto rounded-2xl bg-primary/10 px-4 py-3"
                  style={{ width: `${Math.max(36, (stage.count / max) * 100)}%` }}
                >
                  <p className="text-lg font-bold">{stage.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </div>
                {i < data.stages.length - 1 && (
                  <p className="py-2 text-xs text-muted-foreground">
                    ↓ {data.conversions[i]?.rate ?? 0}% convert
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-secondary p-3 text-sm">
              Search → purchase: <strong>{data.overall_search_to_purchase}%</strong>
            </div>
            <div className="rounded-xl bg-secondary p-3 text-sm">
              View → purchase: <strong>{data.overall_view_to_purchase}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
