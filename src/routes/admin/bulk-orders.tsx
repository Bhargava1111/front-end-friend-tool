import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import {
  getAdminBulkOrdersClient,
  updateAdminBulkOrderClient,
  bulkApproveBulkOrdersClient,
} from "@/lib/admin-client.functions";
import { Package, CheckCheck, Phone, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/bulk-orders")({
  head: () => ({
    meta: [{ title: "Bulk Order Requests — Admin | Sri Mahalakshmi Stores" }],
  }),
  component: AdminBulkOrdersPage,
});

type BulkRequest = {
  id: string;
  name: string;
  phone: string;
  items_text: string;
  estimated_qty: number;
  status: string;
  admin_notes: string;
  created_at: string;
};

function AdminBulkOrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-bulk-orders", filter],
    queryFn: () =>
      getAdminBulkOrdersClient({
        data: filter === "all" ? undefined : { status: filter },
      }) as Promise<BulkRequest[]>,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      updateAdminBulkOrderClient({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bulk-orders"] });
      toast.success("Request updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMutation = useMutation({
    mutationFn: (vars: { ids?: string[]; action: string }) =>
      bulkApproveBulkOrdersClient({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.updated} request${res.updated !== 1 ? "s" : ""}`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-bulk-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = data.filter((r) => r.status === "pending");
  const grouped = (() => {
    const map = new Map<string, BulkRequest[]>();
    for (const r of data) {
      const day = r.created_at?.slice(0, 10) ?? "unknown";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    }
    return Array.from(map.entries());
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Bulk order requests</h1>
          <p className="text-sm text-muted-foreground">
            Wholesale and event orders from the bulk order form
          </p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate({ action: "approve" })}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Approve all pending ({pending.length})
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 rounded-xl text-xs"
              disabled={bulkMutation.isPending}
              onClick={() =>
                bulkMutation.mutate({ ids: Array.from(selected), action: "approve" })
              }
            >
              Approve selected ({selected.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total requests", value: data.length, icon: Package },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Approved", value: data.filter((r) => r.status === "approved").length, icon: Check },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-card" />}

      {grouped.map(([day, items]) => (
        <div key={day} className="space-y-2">
          <h2 className="rounded-xl bg-secondary/50 px-3 py-2 text-xs font-bold text-foreground">
            {new Date(day).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            <span className="ml-2 font-normal text-muted-foreground">({items.length})</span>
          </h2>
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {r.status === "pending" && (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(r.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {r.phone}
                      {r.estimated_qty > 0 && ` · ~${r.estimated_qty} units`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                    r.status === "pending"
                      ? "bg-accent-soft text-accent-foreground"
                      : r.status === "approved"
                        ? "bg-primary-soft text-primary"
                        : r.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-muted-foreground",
                  )}
                >
                  {r.status}
                </span>
              </div>
              <p className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs text-foreground whitespace-pre-wrap">
                {r.items_text}
              </p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl text-xs"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: r.id, status: "approved" })}
                  >
                    <Check className="mr-1 h-3 w-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs text-destructive"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: r.id, status: "rejected" })}
                  >
                    <X className="mr-1 h-3 w-3" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: r.id, status: "contacted" })}
                  >
                    Mark contacted
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No bulk order requests yet.
        </p>
      )}
    </div>
  );
}
