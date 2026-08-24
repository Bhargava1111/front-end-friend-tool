import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { AnalyticsFiltersBar } from "@/components/admin/analytics-filters";
import { DEFAULT_ANALYTICS_FILTERS, type AnalyticsFilters } from "@/lib/admin-analytics";
import { getAdminUserActivity } from "@/lib/admin-ops.functions";
import { getAdminUserActivityClient } from "@/lib/admin-client.functions";

export const Route = createFileRoute("/admin/user-activity")({
  head: () => ({
    meta: [
      { title: "User Activity — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Anonymized store activity." },
    ],
  }),
  component: UserActivityPage,
});

function UserActivityPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const fetchActivity = useAdminFn(getAdminUserActivity, getAdminUserActivityClient);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-activity", filters],
    queryFn: () =>
      fetchActivity({ data: filters }) as Promise<{
        rows: Array<{
          id: string;
          type: string;
          visitor: string;
          session: string;
          label: string;
          created_at: string;
        }>;
      }>,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4" /> User activity
        </h1>
        <p className="text-xs text-muted-foreground">
          Session-level store events. Emails and phone numbers are not shown.
        </p>
      </div>
      <AnalyticsFiltersBar value={filters} onChange={setFilters} />
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-card" />
      ) : (
        <div className="space-y-2">
          {(data?.rows ?? []).map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <p className="font-medium capitalize">
                {row.type.replace("_", " ")} · {row.visitor === "guest" ? "Guest" : "Logged in"}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.label} · session …{row.session} · {new Date(row.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {!data?.rows?.length && (
            <p className="text-xs text-muted-foreground">No activity in this range.</p>
          )}
        </div>
      )}
    </div>
  );
}
