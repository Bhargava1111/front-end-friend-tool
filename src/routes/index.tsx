import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, Bell, MapPin } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell } from "@/components/page-shell";
import { BannerSlider } from "@/components/banner-slider";
import { ProductRail } from "@/components/product-rail";

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
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive">{error.message}</div>
  ),
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-5 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1 text-xs text-primary-foreground/70">
              <MapPin className="h-3.5 w-3.5" /> Deliver to
            </p>
            <p className="mt-0.5 text-sm font-semibold">Bengaluru, Karnataka</p>
          </div>
          <Link
            to="/orders"
            aria-label="Your orders"
            className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15"
          >
            <Bell className="h-4.5 w-4.5" />
          </Link>
        </div>

        <h1 className="mt-4 text-xl font-bold leading-tight">
          Groceries &amp; pooja essentials,
          <br />
          delivered fresh.
        </h1>

        <Link
          to="/search"
          className="mt-4 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          Search for rice, ghee, agarbatti…
        </Link>
      </header>

      <div className="mt-5">
        <BannerSlider banners={data.banners} />
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-base font-bold text-foreground">Shop by category</h2>
          <Link to="/categories" className="text-xs font-medium text-primary">
            See all
          </Link>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="flex w-[76px] shrink-0 flex-col items-center gap-2"
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
      </section>

      <ProductRail title="Featured picks" products={data.featured} />
      <ProductRail title="Best sellers" products={data.bestSelling} />
      <ProductRail title="Newly added" products={data.newest} />
      <ProductRail title="Recommended for you" products={data.recommended} />

      <div className="mt-8 px-4">
        <div className="rounded-3xl bg-accent-soft p-5 text-center">
          <p className="text-sm font-semibold text-accent-foreground">
            Free delivery on orders above ₹499
          </p>
          <p className="mt-1 text-xs text-accent-foreground/75">
            Pay on delivery available across Bengaluru
          </p>
        </div>
      </div>
    </PageShell>
  );
}
