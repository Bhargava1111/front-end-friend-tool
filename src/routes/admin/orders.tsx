import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, Check, Plus, X, Trash2 } from "lucide-react";
import { setOrderDelivery } from "@/lib/admin-ops.functions";
import {
  getAdminOrders,
  setOrderStatus,
  createAdminOrder,
  getAdminProducts,
  getAdminCustomers,
} from "@/lib/admin.functions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [creating, setCreating] = useState(false);
  const [dates, setDates] = useState<Record<string, string>>({});
  const scheduleFn = useServerFn(setOrderDelivery);

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
        <Button className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New order
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
                    onClick={() =>
                      schedule.mutate({ id: o.id, delivery_date: dates[o.id]! })
                    }
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

      <CreateOrderDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/* ---------------------- MANUAL ORDER CREATION ------------------------ */

type Line = { product_id: string; quantity: number };

function CreateOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const fetchCustomers = useServerFn(getAdminCustomers);
  const create = useServerFn(createAdminOrder);

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const { data: catalog } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
    enabled: open,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
    enabled: open,
  });

  const products = catalog?.products ?? [];
  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = products.find((x) => x.id === l.product_id);
        return sum + (p ? Number(p.price) * l.quantity : 0);
      }, 0),
    [lines, products],
  );

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          user_id: userId,
          recipient_name: name,
          phone,
          address_text: address,
          notes: notes || null,
          items: lines,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Order ${res.order_number} created`);
      onOpenChange(false);
      setLines([]);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create order</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return toast.error("Select a customer");
            if (lines.length === 0) return toast.error("Add at least one product");
            mutation.mutate();
          }}
        >
          <div>
            <Label>Customer</Label>
            <Select
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                const c = customers.find((x) => x.id === v);
                if (c) {
                  setName(c.full_name ?? "");
                  setPhone(c.phone ?? "");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name ?? "Customer"} {c.phone ? `· ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="o-name">Recipient</Label>
              <Input
                id="o-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="o-phone">Phone</Label>
              <Input
                id="o-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="o-address">Delivery address</Label>
            <Textarea
              id="o-address"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5 text-xs"
                onClick={() =>
                  setLines([...lines, { product_id: products[0]?.id ?? "", quantity: 1 }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            {lines.length === 0 && (
              <p className="text-xs text-muted-foreground">No items added yet.</p>
            )}
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={l.product_id}
                  onValueChange={(v) =>
                    setLines(lines.map((x, xi) => (xi === i ? { ...x, product_id: v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1 text-xs">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {formatINR(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-16"
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) =>
                    setLines(
                      lines.map((x, xi) =>
                        xi === i
                          ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => setLines(lines.filter((_, xi) => xi !== i))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <p className="pt-1 text-right text-sm font-semibold text-foreground">
              Subtotal {formatINR(subtotal)}
            </p>
          </div>

          <div>
            <Label htmlFor="o-notes">Notes</Label>
            <Input id="o-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

