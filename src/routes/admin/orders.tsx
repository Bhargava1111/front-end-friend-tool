import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminOrders, setOrderStatus } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Order Management — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Review, filter and update the status of customer orders." },
      { property: "og:title", content: "Order Management — Admin" },
      { property: "og:description", content: "Track and fulfil customer orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrders,
});

const STATUSES: OrderStatus[] = ["pending", "confirmed", "packed", "delivered", "cancelled"];

function AdminOrders() {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(getAdminOrders);
  const updateStatus = useServerFn(setOrderStatus);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders() as Promise<Order[]>,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = filter === "all" ? data : data.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize",
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && orders.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No orders in this view.
        </p>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {o.recipient_name} · {o.phone} · {formatDate(o.created_at)}
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">{o.address_text}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                    STATUS_STYLES[o.status],
                  )}
                >
                  {o.status}
                </span>
                <span className="text-sm font-bold">{formatINR(o.total)}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <div className="flex-1 text-xs text-muted-foreground">
                {(o.order_items ?? []).map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
              </div>
              <Select
                value={o.status}
                onValueChange={(v) => mutation.mutate({ id: o.id, status: v as OrderStatus })}
              >
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
