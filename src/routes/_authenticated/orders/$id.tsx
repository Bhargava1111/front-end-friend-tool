import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import { getOrder, cancelOrder } from "@/lib/shop.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES, STATUS_STEPS } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

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

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => fetchOrder({ data: { id } }) as Promise<Order | null>,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}
          >
            {order.status}
          </span>

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
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">
              {Number(order.delivery_fee) === 0 ? "FREE" : formatINR(order.delivery_fee)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatINR(order.total)}</span>
          </div>
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

      {order.status === "pending" && (
        <div className="p-4">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl text-destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            Cancel order
          </Button>
        </div>
      )}
    </PageShell>
  );
}
