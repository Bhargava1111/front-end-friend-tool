import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { findBrandBySlug, getBrandDirectory } from "@/lib/storefront.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { BrandProductsGrid } from "@/components/brand-products-grid";
import { brandGradient, brandInitials, brandRailVisual } from "@/lib/brand-ui";
import { cn } from "@/lib/utils";

const brandDirectoryQuery = queryOptions({
  queryKey: ["brand-directory"],
  queryFn: () => getBrandDirectory(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/brands/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(brandDirectoryQuery);
    const brand = findBrandBySlug(data.brands, params.slug);
    if (!brand) throw notFound();
    return {
      name: brand.name,
      tagline: brand.tagline,
      productCount: brand.products.length,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Brand not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} — Sri Mahalakshmi Stores`;
    const description =
      loaderData.tagline ??
      `Shop ${loaderData.name} products online with fast doorstep delivery.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BrandDetailPage,
  notFoundComponent: () => (
    <PageShell>
      <TopBar title="Brand not found" backTo="/brands" />
      <EmptyState
        icon={<Tag className="h-6 w-6" />}
        title="We couldn't find that brand"
        description="It may have been renamed or removed."
      />
    </PageShell>
  ),
});

function BrandDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(brandDirectoryQuery);
  const brand = findBrandBySlug(data.brands, slug);

  if (!brand) {
    throw notFound();
  }

  const visual = brandRailVisual(brand.logo_url);

  return (
    <PageShell>
      <TopBar title={brand.name} subtitle={brand.tagline ?? "Trusted brand"} backTo="/brands" />

      <div className="mx-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div
          className={cn(
            "flex items-center gap-4 px-4 py-5 text-white sm:px-6",
            visual.type === "logo"
              ? "bg-gradient-to-r from-primary to-primary/85"
              : `bg-gradient-to-r ${brandGradient(brand.name)}`,
          )}
        >
          {visual.type === "logo" ? (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/95 p-2 shadow-sm">
              <img
                src={visual.src}
                alt={brand.name}
                loading="eager"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur-sm">
              {brandInitials(brand.name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{brand.name}</h1>
            <p className="mt-1 text-sm text-white/85">{brand.tagline ?? "Trusted brand"}</p>
            <p className="mt-1 text-xs text-white/70">
              {brand.products.length} product{brand.products.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <BrandProductsGrid name={brand.name} products={brand.products} />
      </div>
    </PageShell>
  );
}
