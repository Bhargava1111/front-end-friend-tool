import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare, ThumbsUp } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/lib/shop.functions";
import { formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/my-reviews")({
  head: () => ({
    meta: [
      { title: "My Reviews — Sri Mahalakshmi Stores" },
      { name: "description", content: "Reviews you've written for products you've purchased." },
    ],
  }),
  component: MyReviewsPage,
});

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3.5 w-3.5",
            s <= value ? "fill-accent text-accent" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function MyReviewsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders() as Promise<Order[]>,
  });

  const delivered = (orders as Order[]).filter((o) => o.status === "delivered");
  const reviewable = delivered.slice(0, 5);

  return (
    <PageShell>
      <TopBar title="My reviews" subtitle="Share your experience" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-accent-soft to-accent-soft/40 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <ThumbsUp className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Your voice matters</p>
            <p className="text-xs text-muted-foreground">
              Help other families choose the right products
            </p>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="mt-6 space-y-3 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      )}

      {!isLoading && reviewable.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="No reviews yet"
          description="Once you receive an order, you can rate and review the products here."
          action={
            <Link to="/orders">
              <Button className="rounded-xl">View my orders</Button>
            </Link>
          }
        />
      )}

      <Reveal className="mt-5 space-y-3 px-4 pb-8">
        {reviewable.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
              <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? "s" : ""} delivered
            </p>
            <div className="mt-3 space-y-2">
              {(order.items ?? []).slice(0, 3).map((item) => (
                <div
                  key={item.id ?? item.product_id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5"
                >
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {item.product_name ?? item.name ?? "Product"}
                  </p>
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.product_slug ?? item.slug ?? "" }}
                    className="shrink-0 text-[11px] font-semibold text-primary"
                  >
                    Write review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Reveal>

      {reviewable.length > 0 && (
        <Reveal className="mx-4 mb-6 rounded-2xl border border-dashed border-border p-4 text-center">
          <StarRating value={5} />
          <p className="mt-2 text-xs text-muted-foreground">
            Reviews are published after moderation. Thank you for helping our community!
          </p>
        </Reveal>
      )}
    </PageShell>
  );
}
