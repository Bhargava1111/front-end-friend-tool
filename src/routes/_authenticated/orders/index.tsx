import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ChevronRight } from "lucide-react";
import { getOrders } from "@/lib/shop.functions";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";
import { STATUS_STYLES } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "active", label: "Active" },
  { key: "past", label: "Past" },
] as const;

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — Sri Mahalakshmi Stores" },
      { name: "description", content: "Track your grocery and pooja product orders." },
      { property: "og:title", content: "My Orders — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Order history and live status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = getOrders;
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders() as Promise<Order[]>,
  });
  const all = data ?? [];
  const orders = all.filter((o) =>
    tab === "active"
      ? ["pending", "confirmed", "packed"].includes(o.status)
      : ["delivered", "cancelled"].includes(o.status),
  );

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-6 text-primary-foreground">
        <h1 className="text-xl font-bold">My Orders</h1>
        <p className="mt-1 text-sm text-primary-foreground/75">Track and re-order easily</p>
        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold",
                tab === t.key ? "bg-primary-foreground text-primary" : "bg-primary-foreground/15",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No orders yet"
          description="Your orders will appear here once you place one."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/categories">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 p-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="block rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{o.order_number}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[o.status]}`}
                >
                  {o.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(o.created_at)} · {o.order_items?.length ?? 0} item
                {(o.order_items?.length ?? 0) === 1 ? "" : "s"}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-base font-bold text-primary">{formatINR(o.total)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
