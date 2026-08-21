import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Zap, Clock, Flame, Tag, ChevronRight } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { flashSaleEndsAt } from "@/lib/mock-content";
import { PageShell, TopBar } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const saleQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

function useCountdown(target: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, "0"));
}

function discount(p: Product) {
  if (!p.mrp || Number(p.mrp) <= Number(p.price)) return 0;
  return Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100);
}

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [
      { title: "Mega Sale — Up to 50% Off | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Limited-time mega sale on groceries, oils, dry fruits and pooja essentials. Flash deals ending tonight.",
      },
      { property: "og:title", content: "Mega Sale — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Up to 50% off on selected items. Ends at midnight." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(saleQuery),
  component: SalePage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
});

function SalePage() {
  const { data } = useSuspenseQuery(saleQuery);
  const hydrated = useHydrated();
  const [h, m, s] = useCountdown(flashSaleEndsAt());

  const all = Array.from(
    new Map(
      [...(data.all ?? []), ...data.newest, ...data.featured, ...data.bestSelling].map((p) => [p.id, p]),
    ).values(),
  );

  const onSale = all
    .filter((p) => p.mrp && Number(p.mrp) > Number(p.price))
    .sort((a, b) => discount(b) - discount(a));

  const topDeals = onSale.slice(0, 3);
  const rest = onSale.slice(3);

  return (
    <PageShell>
      <TopBar title="Mega Sale" subtitle="Up to 50% off" backTo="/" />

      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-destructive via-destructive/90 to-accent p-6 text-destructive-foreground lg:mx-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-background/10 blur-2xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Flame className="h-3 w-3" /> Live now
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl">
            Weekend Mega Sale
          </h1>
          <p className="mt-1.5 text-sm text-destructive-foreground/85">
            Biggest discounts of the season on staples, oils &amp; pooja items
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Ends in</span>
            <div className="flex gap-1.5">
              {[h, m, s].map((v, i) => (
                <span
                  key={i}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-background/25 text-sm font-bold tabular-nums backdrop-blur"
                >
                  {hydrated ? v : "--"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {topDeals.length > 0 && (
        <Reveal className="mt-6 px-4 lg:px-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Zap className="h-4 w-4 text-accent" /> Top picks
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {topDeals.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <span className="absolute left-2 top-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {discount(p)}% OFF
                </span>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal className="mt-6 px-4 lg:px-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Under ₹99", to: "/deals", search: { tab: "budget" as const }, icon: Tag },
            { label: "Flash Sale", to: "/deals", search: { tab: "flash" as const }, icon: Zap },
            { label: "Combo Deals", to: "/deals", search: { tab: "combo" as const }, icon: Flame },
            { label: "All Deals", to: "/deals", search: { tab: "all" as const }, icon: ChevronRight },
          ].map(({ label, to, search, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              search={search}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-6 px-4 lg:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            All sale items ({onSale.length})
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rest.map((p) => (
            <div key={p.id} className="relative">
              {discount(p) > 0 && (
                <span
                  className={cn(
                    "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    discount(p) >= 30
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {discount(p)}% OFF
                </span>
              )}
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {onSale.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No sale items right now. Check back soon!
          </p>
        )}
      </Reveal>

      <Reveal className="mx-4 mt-8 mb-6 rounded-3xl bg-primary p-5 text-primary-foreground lg:mx-0">
        <p className="text-sm font-bold">Save even more with coupons</p>
        <p className="mt-1 text-xs text-primary-foreground/80">
          Use code FIRST100 for ₹100 off your first order above ₹399
        </p>
        <Link
          to="/coupons"
          className="mt-3 inline-flex rounded-xl bg-primary-foreground px-4 py-2 text-xs font-semibold text-primary"
        >
          View all coupons
        </Link>
      </Reveal>
    </PageShell>
  );
}
