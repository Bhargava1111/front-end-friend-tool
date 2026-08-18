import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminActivityLogs } from "@/lib/admin-platform.functions";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  const fetch = useServerFn(getAdminActivityLogs);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => fetch() as Promise<Array<Record<string, string>>>,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold">Audit logs</h1>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}
      <div className="space-y-2">
        {data.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-3 text-xs">
            <p className="font-semibold">
              {l.actor} · {l.action}
            </p>
            <p className="text-muted-foreground">
              {l.resource} {l.resource_id} · {l.ip_address} · {new Date(l.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
