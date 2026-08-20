import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { setOrderDeliveryClient, getAdminOrdersClient, setOrderStatusClient } from "@/lib/admin-client.functions";
import { CalendarClock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { setOrderDelivery } from "@/lib/admin-ops.functions";
import { getAdminOrders, setOrderStatus } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetail,
});

const STATUSES: OrderStatus[] = ["pending", "confirmed", "packed", "delivered", "cancelled"];

function OrderDetail() {
  const { id } = useParams({ from: "/admin/orders/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrders = useAdminFn(getAdminOrders, getAdminOrdersClient);
  const updateStatus = useAdminFn(setOrderStatus, setOrderStatusClient);
  const scheduleFn = useAdminFn(setOrderDelivery, setOrderDeliveryClient);
  const [localDate, setLocalDate] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders() as Promise<Order[]>,
  });

  const order = data.find((o) => o.id === id);

  useEffect(() => {
    if (order) {
      setLocalDate(order.delivery_date ?? "");
    }
  }, [order?.id, order?.delivery_date]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Order updated");
      invalidate();
      navigate({ to: "/admin/orders" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schedule = useMutation({
    mutationFn: (vars: { id: string; delivery_date: string; status?: string }) =>
      scheduleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Delivery date saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPending = mutation.isPending || schedule.isPending;

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!order) {
    return (
      <AdminFormShell backTo="/admin/orders" backLabel="Back to orders" title="Order not found">
        <p className="text-sm text-muted-foreground">This order does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell
      backTo="/admin/orders"
      backLabel="Back to orders"
      title={order.order_number}
      description={`${order.recipient_name} · ${formatDate(order.created_at)}`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
              STATUS_STYLES[order.status],
            )}
          >
            {order.status}
          </span>
          <span className="text-lg font-bold">{formatINR(order.total)}</span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium text-foreground">{order.recipient_name}</dd>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-foreground">{order.phone}</dd>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-foreground">{order.address_text}</dd>
          </div>
          {order.payment_method && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="capitalize text-foreground">{order.payment_method}</dd>
            </div>
          )}
          {order.delivery_slot && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Slot</dt>
              <dd className="text-foreground">{order.delivery_slot}</dd>
            </div>
          )}
          {order.coupon_code && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Coupon</dt>
              <dd className="text-foreground">{order.coupon_code}</dd>
            </div>
          )}
        </dl>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
          <ul className="space-y-2">
            {(order.order_items ?? []).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-2.5"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                  {item.product_weight && (
                    <p className="text-xs text-muted-foreground">{item.product_weight}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatINR(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-foreground">
                  {formatINR(item.line_total)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatINR(order.subtotal)}</span>
          </div>
          {order.discount != null && order.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatINR(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery</span>
            <span>{formatINR(order.delivery_fee)}</span>
          </div>
          {order.tax != null && order.tax > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatINR(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <Label htmlFor="order-delivery-date">Delivery date</Label>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <Input
              id="order-delivery-date"
              type="date"
              className="h-10"
              value={localDate || order.delivery_date || ""}
              onChange={(e) => setLocalDate(e.target.value)}
            />
            {localDate && localDate !== (order.delivery_date ?? "") && (
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => schedule.mutate({ id: order.id, delivery_date: localDate })}
              >
                Save date
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {order.status === "pending" && (
            <>
              <Button
                className="gap-1.5"
                disabled={isPending}
                onClick={() => {
                  const date = localDate || order.delivery_date || "";
                  if (!date) return toast.error("Pick a delivery date first");
                  schedule.mutate(
                    { id: order.id, delivery_date: date, status: "confirmed" },
                    { onSuccess: () => navigate({ to: "/admin/orders" }) },
                  );
                }}
              >
                <Check className="h-4 w-4" /> Approve & schedule
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 border-destructive/40 text-destructive"
                disabled={isPending}
                onClick={() => mutation.mutate({ id: order.id, status: "cancelled" })}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          <Select
            value={order.status}
            onValueChange={(v) => mutation.mutate({ id: order.id, status: v as OrderStatus })}
          >
            <SelectTrigger className="h-10 w-40">
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
    </AdminFormShell>
  );
}
