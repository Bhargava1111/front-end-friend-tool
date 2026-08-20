import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { setOrderDeliveryClient, getAdminOrdersClient, setOrderStatusClient } from "@/lib/admin-client.functions";

import { toast } from "sonner";
import { CalendarClock, Check, Eye, Plus, X } from "lucide-react";
import { setOrderDelivery } from "@/lib/admin-ops.functions";
import { getAdminOrders, setOrderStatus } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/")({
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
  const fetchOrders = useAdminFn(getAdminOrders, getAdminOrdersClient);
  const updateStatus = useAdminFn(setOrderStatus, setOrderStatusClient);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [dates, setDates] = useState<Record<string, string>>({});
  const scheduleFn = useAdminFn(setOrderDelivery, setOrderDeliveryClient);

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schedule = useMutation({
    mutationFn: (vars: { id: string; delivery_date: string; status?: string }) =>
      scheduleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Delivery date saved");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = filter === "all" ? data : data.filter((o) => o.status === filter);
  const pendingCount = data.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-foreground">Orders</h1>
          <p className="text-xs text-muted-foreground">
            {pendingCount
              ? `${pendingCount} order${pendingCount === 1 ? "" : "s"} awaiting approval`
              : "All orders reviewed"}
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/admin/orders/new">
            <Plus className="h-4 w-4" /> New order
          </Link>
        </Button>
      </div>

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

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Could not load orders</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message ?? "Admin session may have expired."}
          </p>
          <Button className="mt-4 rounded-xl" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
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
              <Button size="sm" variant="secondary" className="h-9 gap-1.5 text-xs" asChild>
                <Link to="/admin/orders/$id" params={{ id: o.id }}>
                  <Eye className="h-3.5 w-3.5" /> View details
                </Link>
              </Button>
              {o.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    disabled={mutation.isPending || schedule.isPending}
                    onClick={() => {
                      const date = dates[o.id] ?? o.delivery_date ?? "";
                      if (!date) return toast.error("Pick a delivery date first");
                      schedule.mutate({ id: o.id, delivery_date: date, status: "confirmed" });
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve & schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 border-destructive/40 text-xs text-destructive"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: o.id, status: "cancelled" })}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              )}
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
                <Input
                  type="date"
                  aria-label={`Delivery date for ${o.order_number}`}
                  className="h-9 w-[9.5rem] text-xs"
                  value={dates[o.id] ?? o.delivery_date ?? ""}
                  onChange={(e) => setDates({ ...dates, [o.id]: e.target.value })}
                />
                {(dates[o.id] ?? "") !== "" && dates[o.id] !== (o.delivery_date ?? "") && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 text-xs"
                    disabled={schedule.isPending}
                    onClick={() => schedule.mutate({ id: o.id, delivery_date: dates[o.id]! })}
                  >
                    Save
                  </Button>
                )}
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
