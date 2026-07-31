import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Zap, Percent, IndianRupee } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const dealsQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

const TABS = [
  { key: "all", label: "All deals" },
  { key: "flash", label: "Flash sale" },
  { key: "today", label: "Today's deals" },
  { key: "budget", label: "Under ₹99" },
] as const;

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Today's Deals & Flash Sale — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Every live offer in one place: flash sale, deal of the day, today's deals and the under ₹99 store.",
      },
      { property: "og:title", content: "Today's Deals & Flash Sale" },
      { property: "og:description", content: "All discounted groceries and pooja items, updated daily." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(dealsQuery);
  },
  component: DealsPage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <EmptyState icon={<Zap className="h-6 w-6" />} title="Couldn't load deals" description={error.message} />
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <EmptyState icon={<Zap className="h-6 w-6" />} title="Not found" description="This page doesn't exist." />
    </PageShell>
  ),
});

function discount(p: Product) {
  if (!p.mrp || Number(p.mrp) <= Number(p.price)) return 0;
  return Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100);
}

function DealsPage() {
  const { data } = useSuspenseQuery(dealsQuery);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const all = Array.from(
    new Map(
      [...(data.all ?? []), ...data.newest, ...data.featured, ...data.bestSelling].map((p) => [p.id, p]),
    ).values(),
  );
  const discounted = all.filter((p) => discount(p) > 0).sort((a, b) => discount(b) - discount(a));

  const list =
    tab === "flash"
      ? discounted.slice(0, 20)
      : tab === "today"
        ? data.featured
        : tab === "budget"
          ? all.filter((p) => Number(p.price) <= 99)
          : discounted;

  const best = discounted[0];

  return (
    <PageShell>
      <TopBar title="Deals & offers" subtitle="Flash sale, daily deals & savings" backTo="/" />

      {best && (
        <Reveal className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Deal of the day</p>
              <p className="line-clamp-1 text-xs text-primary-foreground/80">
                {best.name} · {formatINR(best.price)} ({discount(best)}% off)
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 px-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Percent className="h-3.5 w-3.5" /> {discounted.length} discounted items
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee className="h-3.5 w-3.5" /> {all.filter((p) => Number(p.price) <= 99).length} under ₹99
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Zap className="h-6 w-6" />} title="No deals here yet" description="Check back soon for fresh offers." />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
