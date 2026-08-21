import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, ShoppingCart, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/lib/shop.functions";
import { reorder } from "@/lib/engage.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reorder")({
  head: () => ({
    meta: [
      { title: "Reorder — Sri Mahalakshmi Stores" },
      { name: "description", content: "Quickly reorder from your past purchases." },
    ],
  }),
  component: ReorderPage,
});

function ReorderPage() {
  const queryClient = useQueryClient();
  const repeat = useServerFn(reorder);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders() as Promise<Order[]>,
  });

  const delivered = (orders as Order[])
    .filter((o) => o.status === "delivered")
    .slice(0, 10);

  const reorderMutation = useMutation({
    mutationFn: (orderId: string) => repeat({ data: { orderId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(`Added ${result.added} item${result.added !== 1 ? "s" : ""} to cart`, {
        description: result.skipped > 0 ? `${result.skipped} unavailable` : undefined,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell>
      <TopBar title="Reorder" subtitle="Buy again in one tap" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary-soft to-accent-soft/40 p-5">
        <RotateCcw className="h-6 w-6 text-primary" />
        <p className="mt-2 text-sm font-bold text-foreground">Your frequent orders</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Re-add everything from a past order to your cart instantly
        </p>
      </section>

      {isLoading && (
        <div className="mt-5 space-y-3 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      )}

      {!isLoading && delivered.length === 0 && (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="No orders to reorder"
          description="Once you've received an order, it will appear here for quick reordering."
          action={
            <Link to="/categories">
              <Button className="rounded-xl">Start shopping</Button>
            </Link>
          }
        />
      )}

      <div className="mt-5 space-y-3 px-4 pb-8">
        {delivered.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{order.order_number}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatINR(order.total)}</p>
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                    STATUS_STYLES[order.status as OrderStatus],
                  )}
                >
                  {order.status}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(order.items ?? []).slice(0, 4).map((item) => (
                <span
                  key={item.id ?? item.product_id}
                  className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-medium text-foreground"
                >
                  {item.product_name ?? item.name ?? "Item"} ×{item.quantity}
                </span>
              ))}
              {(order.items ?? []).length > 4 && (
                <span className="rounded-lg bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
                  +{(order.items ?? []).length - 4} more
                </span>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 rounded-xl text-xs"
                disabled={reorderMutation.isPending}
                onClick={() => reorderMutation.mutate(order.id)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reorder all
              </Button>
              <Link to="/orders/$id" params={{ id: order.id }} className="flex-1">
                <Button size="sm" variant="outline" className="w-full rounded-xl text-xs">
                  View details
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
