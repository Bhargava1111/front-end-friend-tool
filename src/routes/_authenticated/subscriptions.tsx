import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCcw, Calendar, Percent, Check, Package } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";

const query = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

const FREQUENCIES = [
  { id: "weekly", label: "Weekly", discount: 5 },
  { id: "biweekly", label: "Every 2 weeks", discount: 7 },
  { id: "monthly", label: "Monthly", discount: 10 },
] as const;

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscribe & Save — Sri Mahalakshmi Stores" },
      { name: "description", content: "Set up recurring deliveries for your monthly staples and save up to 10%." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(query),
  component: SubscriptionsPage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
});

function SubscriptionsPage() {
  const { data } = useSuspenseQuery(query);
  const [frequency, setFrequency] = useState<string>("monthly");
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());

  const staples = (data.bestSelling ?? []).slice(0, 8);
  const selectedFreq = FREQUENCIES.find((f) => f.id === frequency) ?? FREQUENCIES[2];

  function toggleSubscribe(id: string, name: string) {
    setSubscribed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info(`Removed ${name} from subscriptions`);
      } else {
        next.add(id);
        toast.success(`${name} added — ${selectedFreq.label} delivery`);
      }
      return next;
    });
  }

  return (
    <PageShell>
      <TopBar title="Subscribe & save" subtitle="Never run out of staples" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
        <RefreshCcw className="h-7 w-7" />
        <h1 className="mt-2 text-lg font-bold">Auto-restock your pantry</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Save up to 10% on recurring orders. Pause or cancel anytime.
        </p>
      </section>

      <Reveal className="mt-5 px-4">
        <p className="text-sm font-semibold text-foreground">Delivery frequency</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrequency(f.id)}
              className={cn(
                "rounded-xl border py-3 text-center transition-colors",
                frequency === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <p className="text-xs font-bold">{f.label}</p>
              <p className="mt-0.5 text-[10px] opacity-80">{f.discount}% off</p>
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-5 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Popular subscriptions</p>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Percent className="h-3 w-3" /> {selectedFreq.discount}% off each delivery
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {staples.map((p) => {
            const isSub = subscribed.has(p.id);
            const discounted = Number(p.price) * (1 - selectedFreq.discount / 100);
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                  isSub ? "border-primary bg-primary-soft/30" : "border-border bg-card",
                )}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{formatINR(discounted)}</span>
                    <span className="ml-1 line-through opacity-60">{formatINR(p.price)}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isSub ? "default" : "outline"}
                  className="shrink-0 rounded-xl text-xs"
                  onClick={() => toggleSubscribe(p.id, p.name)}
                >
                  {isSub ? (
                    <>
                      <Check className="mr-1 h-3 w-3" /> Active
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Reveal>

      {subscribed.size > 0 && (
        <Reveal className="mx-4 mt-5 mb-6 rounded-2xl border border-primary/30 bg-primary-soft/20 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {subscribed.size} active subscription{subscribed.size !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Next delivery: {selectedFreq.label.toLowerCase()} from today
          </p>
          <Link to="/orders">
            <Button className="mt-3 w-full rounded-xl text-xs">Manage in orders</Button>
          </Link>
        </Reveal>
      )}

      <Reveal className="mx-4 mb-8 rounded-2xl border border-border bg-card p-4">
        <Package className="h-5 w-5 text-primary" />
        <p className="mt-2 text-sm font-semibold text-foreground">How it works</p>
        <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>1. Pick products and choose a delivery frequency</li>
          <li>2. We auto-charge and deliver on your schedule</li>
          <li>3. Skip, pause or cancel any time from your account</li>
        </ol>
      </Reveal>
    </PageShell>
  );
}
