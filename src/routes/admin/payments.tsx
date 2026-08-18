import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminPayments } from "@/lib/admin-platform.functions";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const fetch = useServerFn(getAdminPayments);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () =>
      fetch() as Promise<{
        payments: Array<Record<string, string | number>>;
        summary: { by_method: Array<{ method: string; total: number; count: number }>; failed_count: number };
      }>,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold">Payments & settlements</h1>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.summary.by_method.map((m) => (
              <div key={m.method} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase text-muted-foreground">{m.method}</p>
                <p className="text-lg font-bold">{formatINR(m.total)}</p>
                <p className="text-xs text-muted-foreground">{m.count} payments</p>
              </div>
            ))}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-bold text-destructive">{data.summary.failed_count}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payments.map((p) => (
                  <tr key={String(p.id)}>
                    <td className="px-4 py-2">{p.order_number}</td>
                    <td className="px-4 py-2">{p.method}</td>
                    <td className="px-4 py-2">{formatINR(Number(p.amount))}</td>
                    <td className="px-4 py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
