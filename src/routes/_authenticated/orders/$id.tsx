import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin, RotateCcw, Download, PackageX, Truck } from "lucide-react";
import { toast } from "sonner";
import { getOrder, cancelOrder } from "@/lib/shop.functions";
import { requestReturn, getReturnsForOrder, reorder } from "@/lib/engage.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES, STATUS_STEPS } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const RETURN_REASONS = [
  "Item damaged in transit",
  "Wrong item delivered",
  "Item expired or near expiry",
  "Quality not as expected",
  "Missing item from order",
];

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Sri Mahalakshmi Stores" },
      { name: "description", content: "View items, delivery address and status of your order." },
      { property: "og:title", content: "Order details — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Track your order status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchOrder = useServerFn(getOrder);
  const cancel = useServerFn(cancelOrder);
  const sendReturn = useServerFn(requestReturn);
  const fetchReturns = useServerFn(getReturnsForOrder);
  const repeat = useServerFn(reorder);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => fetchOrder({ data: { id } }) as Promise<Order | null>,
    refetchInterval: 30_000,
  });

  const { data: returns } = useQuery({
    queryKey: ["order-returns", id],
    queryFn: () =>
      fetchReturns({ data: { orderId: id } }) as Promise<
        Array<{ id: string; reason: string; status: string; created_at: string }>
      >,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const returnMutation = useMutation({
    mutationFn: () => sendReturn({ data: { orderId: id, reason, details: details || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-returns", id] });
      setReturnOpen(false);
      setDetails("");
      toast.success("Return request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: () => repeat({ data: { orderId: id } }),
    onSuccess: (res: { added: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(
        res.skipped
          ? `${res.added} item(s) added, ${res.skipped} unavailable`
          : `${res.added} item(s) added to cart`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function downloadInvoice() {
    if (!order) return;
    const rows = (order.order_items ?? [])
      .map(
        (i) =>
          `${i.product_name}${i.product_weight ? ` (${i.product_weight})` : ""} x${i.quantity} — ${formatINR(i.line_total)}`,
      )
      .join("\n");
    const text = [
      "SRI MAHALAKSHMI STORES",
      `Invoice for ${order.order_number}`,
      `Date: ${formatDate(order.created_at)}`,
      "",
      rows,
      "",
      `Subtotal: ${formatINR(order.subtotal)}`,
      order.discount ? `Discount: -${formatINR(order.discount)}` : "",
      `Delivery: ${Number(order.delivery_fee) === 0 ? "FREE" : formatINR(order.delivery_fee)}`,
      order.tax ? `Taxes: ${formatINR(order.tax)}` : "",
      `Total: ${formatINR(order.total)}`,
      "",
      `Deliver to: ${order.recipient_name}, ${order.address_text}, ${order.phone}`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.order_number}-invoice.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <PageShell>
        <TopBar title="Order" />
        <div className="space-y-3 p-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <TopBar title="Order" />
        <p className="p-8 text-center text-sm text-muted-foreground">Order not found.</p>
      </PageShell>
    );
  }

  const activeStep = STATUS_STEPS.indexOf(order.status);

  return (
    <PageShell>
      <TopBar title={order.order_number} subtitle={formatDate(order.created_at)} />

      <div className="p-4">
        <div className="rounded-2xl border border-border bg-card p-4 card-elevated">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
            {order.delivery_slot && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> {order.delivery_slot}
              </span>
            )}
          </div>

          {order.delivery_date && order.status !== "cancelled" && (
            <p className="mt-2 rounded-xl bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
              Delivery scheduled for {formatDate(order.delivery_date)}
            </p>
          )}

          {order.status !== "cancelled" && (
            <div className="mt-4 flex items-center">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold",
                        i <= activeStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {i <= activeStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="text-[10px] capitalize text-muted-foreground">{step}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <span
                      className={cn(
                        "mx-1 mb-4 h-0.5 flex-1 rounded-full",
                        i < activeStep ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="px-4">
        <h2 className="mb-2 text-sm font-semibold">Items</h2>
        <div className="space-y-2.5">
          {(order.order_items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3 card-elevated"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold">{item.product_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {item.product_weight ? `${item.product_weight} · ` : ""}Qty {item.quantity}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">{formatINR(item.line_total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-sm card-elevated">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatINR(order.subtotal)}</span>
          </div>
          {Number(order.discount ?? 0) > 0 && (
            <div className="flex justify-between py-1 text-primary">
              <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
              <span className="font-medium">−{formatINR(order.discount!)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">
              {Number(order.delivery_fee) === 0 ? "FREE" : formatINR(order.delivery_fee)}
            </span>
          </div>
          {Number(order.tax ?? 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Taxes &amp; charges</span>
              <span className="font-medium">{formatINR(order.tax!)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatINR(order.total)}</span>
          </div>
          {order.payment_method && (
            <p className="mt-2 text-xs capitalize text-muted-foreground">
              Paid via {order.payment_method === "cod" ? "cash on delivery" : order.payment_method}
            </p>
          )}
        </div>
      </section>

      <section className="px-4 pb-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" /> Delivery to
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm card-elevated">
          <p className="font-semibold">{order.recipient_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{order.address_text}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{order.phone}</p>
        </div>
      </section>

      {(returns ?? []).length > 0 && (
        <section className="px-4 pb-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <PackageX className="h-4 w-4 text-primary" /> Return requests
          </h2>
          <div className="space-y-2">
            {(returns ?? []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.reason}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize">
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            disabled={reorderMutation.isPending}
            onClick={() => reorderMutation.mutate()}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reorder
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={downloadInvoice}>
            <Download className="mr-2 h-4 w-4" /> Invoice
          </Button>
        </div>

        {order.status === "delivered" && (
          <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 w-full rounded-xl">
                <PackageX className="mr-2 h-4 w-4" /> Request a return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request a return</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-reason">Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="r-reason">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-details">Details (optional)</Label>
                  <Textarea
                    id="r-details"
                    value={details}
                    maxLength={1000}
                    onChange={(e) => setDetails(e.target.value)}
                    className="rounded-xl"
                    placeholder="Tell us what went wrong"
                  />
                </div>
                <Button
                  className="w-full rounded-xl"
                  disabled={returnMutation.isPending}
                  onClick={() => returnMutation.mutate()}
                >
                  Submit request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {order.status === "pending" && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl text-destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            Cancel order
          </Button>
        )}
      </div>
    </PageShell>
  );
}
