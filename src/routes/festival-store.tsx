import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles, Flame, Gift, ChevronRight, Star } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { FestivalPicks } from "@/components/home-sections";

const query = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

const FESTIVALS = [
  {
    name: "Diwali",
    emoji: "🪔",
    desc: "Diyas, agarbatti, sweets & gift hampers",
    slug: "pooja-essentials",
    tone: "from-accent to-accent/70",
  },
  {
    name: "Pongal",
    emoji: "🌾",
    desc: "Rice, jaggery, ghee & harvest staples",
    slug: "groceries",
    tone: "from-primary to-primary/70",
  },
  {
    name: "Navratri",
    emoji: "🌺",
    desc: "Flowers, kumkum, lamps & fasting foods",
    slug: "pooja-essentials",
    tone: "from-destructive/80 to-accent",
  },
  {
    name: "Onam",
    emoji: "🥘",
    desc: "Banana chips, payasam ingredients & spices",
    slug: "groceries",
    tone: "from-primary/80 to-accent/80",
  },
];

export const Route = createFileRoute("/festival-store")({
  head: () => ({
    meta: [
      { title: "Festival Store — Pooja & Seasonal Essentials | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Shop Diwali, Pongal, Navratri and Onam essentials. Curated combos and ritual supplies.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(query),
  component: FestivalStorePage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
});

function FestivalStorePage() {
  const { data } = useSuspenseQuery(query);
  const all = Array.from(
    new Map(
      [...(data.all ?? []), ...data.featured, ...data.bestSelling].map((p) => [p.id, p]),
    ).values(),
  );
  const topCategories = data.categories.filter((c) => !c.parent_id);

  return (
    <PageShell>
      <TopBar title="Festival store" subtitle="Celebrate with authentic essentials" backTo="/" />

      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-accent/90 to-primary p-6 text-accent-foreground lg:mx-0">
        <Sparkles className="h-8 w-8" />
        <h1 className="mt-3 text-2xl font-bold leading-tight">Festival season is here</h1>
        <p className="mt-1.5 text-sm text-accent-foreground/85">
          Curated pooja kits, sweets ingredients and gift combos — delivered before the celebrations begin
        </p>
      </section>

      <Reveal className="mt-6 px-4 lg:px-0">
        <h2 className="text-base font-bold text-foreground">Shop by festival</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FESTIVALS.map((f) => (
            <Link
              key={f.name}
              to="/category/$slug"
              params={{ slug: f.slug }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${f.tone} p-5 text-primary-foreground transition-transform active:scale-[0.98]`}
            >
              <span className="text-3xl">{f.emoji}</span>
              <p className="mt-2 text-base font-bold">{f.name}</p>
              <p className="mt-0.5 text-xs text-primary-foreground/80">{f.desc}</p>
              <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 opacity-70" />
            </Link>
          ))}
        </div>
      </Reveal>

      <FestivalPicks
        categories={topCategories}
        products={all}
        title="Festival bestsellers"
      />

      <Reveal className="mt-7 px-4 lg:px-0">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-destructive" />
          <h2 className="text-base font-bold text-foreground">Pooja combos</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {all
            .filter((p) => p.name.toLowerCase().includes("combo") || p.name.toLowerCase().includes("kit"))
            .slice(0, 8)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </Reveal>

      <Reveal className="mt-7">
        <ProductRail title="Gift hampers" products={data.featured} href={{ to: "/gift-cards" }} />
      </Reveal>

      <Reveal className="mx-4 mt-8 mb-6 rounded-3xl border border-accent/30 bg-accent-soft p-5 lg:mx-0">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-bold text-accent-foreground">Festival delivery guarantee</p>
            <p className="mt-1 text-xs text-accent-foreground/75">
              Order 48 hours before the festival for guaranteed doorstep delivery. Priority slots for pooja essentials.
            </p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-accent text-accent" />
              ))}
              <span className="ml-1 text-xs font-semibold text-accent-foreground">4.9 from 2,400+ festival orders</span>
            </div>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
