import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PackageX } from "lucide-react";
import { toast } from "sonner";
import { adminListReturns, adminSetReturnStatus } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/returns")({
  component: AdminReturnsPage,
});

type ReturnRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  order: { order_number: string; total: number; recipient_name: string } | null;
};

const STATUS_TONE: Record<string, string> = {
  requested: "bg-accent-soft text-accent-foreground",
  approved: "bg-primary-soft text-primary",
  rejected: "bg-destructive/10 text-destructive",
  refunded: "bg-primary text-primary-foreground",
};

function AdminReturnsPage() {
  const list = useServerFn(adminListReturns);
  const setStatus = useServerFn(adminSetReturnStatus);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: () => list() as Promise<ReturnRow[]>,
  });

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: string }) => setStatus({ data: v }),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      toast.success(`Return marked ${v.status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="text-lg font-bold text-foreground">Return requests</h1>
      <p className="mb-4 text-xs text-muted-foreground">Approve, reject or mark returns as refunded</p>

      {isError ? (
        <ErrorState description="Could not load returns." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <PackageX className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No return requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold">{r.order?.order_number ?? "Order removed"}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status] ?? "bg-secondary"}`}>
                  {r.status}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Reason:</span> {r.reason}
              </p>
              {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {r.order?.recipient_name} · {r.order ? formatINR(r.order.total) : "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["approved", "rejected", "refunded"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={r.status === s ? "default" : "outline"}
                    className="rounded-xl capitalize"
                    disabled={r.status === s || mutation.isPending}
                    onClick={() => mutation.mutate({ id: r.id, status: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
