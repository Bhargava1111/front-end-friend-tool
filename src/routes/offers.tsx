import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, ChevronRight } from "lucide-react";
import { getHomeData } from "@/lib/catalog.functions";
import { getPlacementBanners } from "@/lib/storefront.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { FestivalPicks, OfferCards } from "@/components/home-sections";
import { CouponStrip } from "@/components/home-sections";

const offersQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Festive Picks — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Browse every live offer banner, festive collection and seasonal pooja bundle available in the store.",
      },
      { property: "og:title", content: "Offers & Festive Picks" },
      { property: "og:description", content: "Festive collections, combo offers and seasonal savings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(offersQuery);
  },
  component: OffersPage,
  pendingComponent: () => (
    <PageShell>
      <GridSkeleton />
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <EmptyState icon={<Gift className="h-6 w-6" />} title="Couldn't load offers" description={error.message} />
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <EmptyState icon={<Gift className="h-6 w-6" />} title="Not found" description="This page doesn't exist." />
    </PageShell>
  ),
});

function OffersPage() {
  const { data } = useSuspenseQuery(offersQuery);
  const fetchBanners = useServerFn(getPlacementBanners);
  const { data: offerBanners = [] } = useQuery({
    queryKey: ["placement-banners", "offers"],
    queryFn: () => fetchBanners({ data: { placement: "offers" as const } }),
    staleTime: 5 * 60 * 1000,
  });
  const banners = offerBanners.length ? offerBanners : data.banners;
  const all = Array.from(
    new Map(
      [...(data.all ?? []), ...data.newest, ...data.featured, ...data.bestSelling].map((p) => [p.id, p]),
    ).values(),
  );

  return (
    <PageShell>
      <TopBar title="Offers & festive picks" subtitle="Every live campaign" backTo="/" />

      <div className="space-y-3 px-4 pt-4">
        {banners.map((b, i) => {
          const card = (
            <div className="relative h-[150px] w-full overflow-hidden rounded-3xl card-elevated">
              <img src={b.image_url} alt={b.title} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex w-3/4 flex-col justify-center p-5">
                <p className="text-base font-bold leading-tight text-background">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-xs text-background/80">{b.subtitle}</p>}
                {b.link_slug && (
                  <span className="mt-3 inline-flex w-fit items-center gap-0.5 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold text-foreground">
                    Shop now <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
          return (
            <Reveal key={b.id} delay={i * 0.04}>
              {b.link_slug ? (
                <Link to="/category/$slug" params={{ slug: b.link_slug }}>
                  {card}
                </Link>
              ) : (
                card
              )}
            </Reveal>
          );
        })}
      </div>

      <OfferCards />
      <CouponStrip />
      <FestivalPicks categories={data.categories} products={all} title="Festive collections" />
    </PageShell>
  );
}
