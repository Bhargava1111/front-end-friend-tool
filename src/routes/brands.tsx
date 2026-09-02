import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Tag } from "lucide-react";
import { getBrandDirectory } from "@/lib/storefront.functions";
import { resolveBrandFromParam } from "@/lib/banner-routing";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { brandGradient, brandInitials, brandRailVisual } from "@/lib/brand-ui";
import { cn } from "@/lib/utils";

const brandDirectoryQuery = queryOptions({
  queryKey: ["brand-directory"],
  queryFn: () => getBrandDirectory(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/brands")({
  validateSearch: (search: Record<string, unknown>) => ({
    brand: typeof search.brand === "string" && search.brand.trim() ? search.brand.trim() : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    if (!search.brand) return;
    const data = await context.queryClient.ensureQueryData(brandDirectoryQuery);
    const match = resolveBrandFromParam(data.brands, search.brand);
    if (match?.slug) {
      throw redirect({ to: "/brands/$slug", params: { slug: match.slug } });
    }
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(brandDirectoryQuery);
  },
  head: () => ({
    meta: [
      { title: "Featured Brands — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Explore trusted grocery and pooja brands with their full range of products and offers.",
      },
      { property: "og:title", content: "Featured Brands" },
      { property: "og:description", content: "Shop by your favourite grocery and pooja brands." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data } = useSuspenseQuery(brandDirectoryQuery);

  return (
    <PageShell>
      <TopBar title="Featured brands" subtitle="Trusted names, curated ranges" backTo="/" />

      {data.brands.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No brands yet"
          description="Brands will appear here once the store adds them."
        />
      ) : (
        <div className="grid gap-3 px-4 pb-28 sm:grid-cols-2 lg:grid-cols-3">
          {data.brands.map((brand, index) => {
            const visual = brandRailVisual(brand.logo_url);
            return (
              <Reveal key={brand.id} delay={index * 0.03}>
                <Link
                  to="/brands/$slug"
                  params={{ slug: brand.slug }}
                  className="group flex overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                >
                  <div
                    className={cn(
                      "flex w-28 shrink-0 items-center justify-center p-3",
                      visual.type === "logo" ? "bg-white" : `bg-gradient-to-br ${brandGradient(brand.name)}`,
                    )}
                  >
                    {visual.type === "logo" ? (
                      <img
                        src={visual.src}
                        alt={brand.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/25 text-lg font-bold text-white">
                        {brandInitials(brand.name)}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-foreground">{brand.name}</h2>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {brand.tagline ?? "Trusted brand"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary">
                        {brand.products.length} product{brand.products.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
