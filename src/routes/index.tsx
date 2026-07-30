import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, MapPin, Sparkles } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell } from "@/components/page-shell";
import { BannerSlider } from "@/components/banner-slider";
import { ProductRail } from "@/components/product-rail";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocationBar } from "@/components/location-bar";
import { FadeIn, Reveal } from "@/components/motion";
import { HomeSkeleton } from "@/components/skeletons";
import {
  BrandRail,
  CouponStrip,
  FlashSaleRail,
  OfferCards,
  RecentlyViewedRail,
} from "@/components/home-sections";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sri Mahalakshmi Stores — Grocery & Pooja Essentials Delivered" },
      {
        name: "description",
        content:
          "Shop premium groceries, pooja essentials, cold-pressed oils, dals and dry fruits with quick doorstep delivery.",
      },
      { property: "og:title", content: "Sri Mahalakshmi Stores — Grocery & Pooja Essentials" },
      {
        property: "og:description",
        content: "Fresh groceries and authentic pooja items delivered to your door.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(homeQuery);
  },
  component: Home,
  pendingComponent: () => (
    <PageShell>
      <HomeSkeleton />
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">We couldn't load the store</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </PageShell>
  ),
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  const allProducts = Array.from(
    new Map(
      [...data.newest, ...data.featured, ...data.bestSelling].map((p) => [p.id, p]),
    ).values(),
  );
  const trending = data.bestSelling.length ? data.bestSelling : data.newest;

  return (
    <PageShell>
      <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary via-primary to-primary/85 px-4 pb-7 pt-5 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <LocationBar className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/stores"
              aria-label="Store locator"
              className="grid h-9 w-9 place-items-center rounded-full border border-primary-foreground/25 bg-primary-foreground/15"
            >
              <MapPin className="h-4.5 w-4.5" />
            </Link>
            <ThemeToggle className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground" />
            <NotificationBell className="border border-primary-foreground/25 bg-primary-foreground/15" />
          </div>
        </div>

        <FadeIn delay={0.05}>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-medium">
            <Sparkles className="h-3 w-3 text-accent" /> Delivery in 60 minutes
          </span>
          <h1 className="mt-2.5 text-[26px] font-bold leading-[1.15] tracking-tight text-balance-tight">
            Groceries &amp; pooja essentials,
            <br />
            delivered fresh.
          </h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <Link
            to="/search"
            className="mt-4 flex items-center gap-2 rounded-2xl border border-border/40 bg-card/90 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur"
          >
            <Search className="h-4 w-4" />
            Search for rice, ghee, agarbatti…
          </Link>
        </FadeIn>
      </header>

      <Reveal className="mt-5">
        <BannerSlider banners={data.banners} />
      </Reveal>

      <Reveal className="mt-7">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-base font-bold text-foreground">Shop by category</h2>
          <Link to="/categories" className="text-xs font-medium text-primary">
            See all
          </Link>
        </div>
        <div
          ref={categoryScrollRef}
          className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1"
        >
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="flex w-[76px] shrink-0 flex-col items-center gap-2 transition-transform active:scale-95"
            >
              <div className="h-[76px] w-[76px] overflow-hidden rounded-2xl border border-border bg-accent-soft">
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      <FlashSaleRail products={allProducts} />
      <OfferCards />

      <Reveal>
        <ProductRail title="Today's deals" products={data.featured} />
      </Reveal>

      <CouponStrip />

      <Reveal>
        <ProductRail title="Trending now" products={trending} />
      </Reveal>

      <Reveal>
        <ProductRail title="Best sellers" products={data.bestSelling} />
      </Reveal>

      <RecentlyViewedRail />

      <Reveal>
        <ProductRail title="Recommended for you" products={data.recommended} />
      </Reveal>

      <BrandRail />

      <Reveal>
        <ProductRail title="Newly added" products={data.newest} />
      </Reveal>

      <Reveal className="mt-8 px-4">
        <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-soft to-accent-soft/40 p-5 text-center">
          <p className="text-sm font-semibold text-accent-foreground">
            Free delivery on orders above ₹499
          </p>
          <p className="mt-1 text-xs text-accent-foreground/75">
            Pay on delivery available across Bengaluru
          </p>
        </div>
      </Reveal>
    </PageShell>
  );
}
