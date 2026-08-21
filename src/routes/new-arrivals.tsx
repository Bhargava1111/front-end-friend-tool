import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Star, ArrowRight } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";

const query = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/new-arrivals")({
  head: () => ({
    meta: [
      { title: "New Arrivals — Fresh Products | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Discover the latest groceries, cold-pressed oils, dry fruits and pooja essentials added to our store.",
      },
      { property: "og:title", content: "New Arrivals — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Fresh products added this week." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(query),
  component: NewArrivalsPage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
});

function NewArrivalsPage() {
  const { data } = useSuspenseQuery(query);
  const newest = data.newest ?? [];
  const featured = data.featured ?? [];
  const topCategories = data.categories.filter((c) => !c.parent_id).slice(0, 6);

  return (
    <PageShell>
      <TopBar title="New arrivals" subtitle="Fresh picks this week" backTo="/" />

      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-6 text-primary-foreground lg:mx-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-background/10 blur-2xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-bold">
            <Sparkles className="h-3 w-3" /> Just landed
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight">
            {newest.length} new products this week
          </h1>
          <p className="mt-1.5 text-sm text-primary-foreground/85">
            Handpicked staples, oils and ritual supplies — sourced fresh for your home
          </p>
        </div>
      </section>

      <Reveal className="mt-6 px-4 lg:px-0">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {topCategories.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 transition-transform active:scale-95"
            >
              <div className="h-12 w-12 overflow-hidden rounded-xl bg-accent-soft">
                {c.image_url && (
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="line-clamp-2 text-center text-[10px] font-semibold text-foreground">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-7 px-4 lg:px-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Latest additions</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {newest.map((p) => (
            <div key={p.id} className="relative">
              <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                NEW
              </span>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {newest.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            New products coming soon. Check back later!
          </p>
        )}
      </Reveal>

      {featured.length > 0 && (
        <Reveal className="mt-7">
          <ProductRail title="Staff picks" products={featured} href={{ to: "/deals", search: { tab: "recommended" } }} />
        </Reveal>
      )}

      <Reveal className="mx-4 mt-8 mb-6 rounded-3xl border border-accent/30 bg-accent-soft p-5 lg:mx-0">
        <div className="flex items-start gap-3">
          <Star className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-bold text-accent-foreground">Be the first to try</p>
            <p className="mt-1 text-xs text-accent-foreground/75">
              New arrivals often sell out fast. Add to wishlist to get notified when stock is low.
            </p>
            <Link
              to="/wishlist"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Go to wishlist <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
