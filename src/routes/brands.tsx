import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { getBrandDirectory } from "@/lib/storefront.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductRail } from "@/components/product-rail";
import { Reveal } from "@/components/motion";

export const Route = createFileRoute("/brands")({
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
  const { data, isLoading } = useQuery({
    queryKey: ["brand-directory"],
    queryFn: () => getBrandDirectory(),
  });

  return (
    <PageShell>
      <TopBar title="Featured brands" subtitle="Trusted names, curated ranges" backTo="/" />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : !data || data.brands.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No brands yet"
          description="Brands will appear here once the store adds them."
        />
      ) : (
        <div className="pb-4">
          {data.brands.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.03} className="mt-4">
              <div className="mx-4 overflow-hidden rounded-3xl border border-border bg-card card-elevated">
                <div className="relative h-[120px] w-full bg-secondary">
                  {b.banner_url && (
                    <img
                      src={b.banner_url}
                      alt={`${b.name} offers`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
                    {b.logo_url ? (
                      <img
                        src={b.logo_url}
                        alt={b.name}
                        loading="lazy"
                        className="h-11 w-11 rounded-full border border-background/60 object-cover"
                      />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-background text-sm font-bold text-primary">
                        {b.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-background">{b.name}</p>
                      <p className="line-clamp-1 text-[11px] text-background/80">
                        {b.tagline ?? "Trusted brand"}
                      </p>
                    </div>
                  </div>
                </div>
                {b.products.length > 0 ? (
                  <ProductRail title={`From ${b.name}`} products={b.products} />
                ) : (
                  <p className="px-4 py-5 text-xs text-muted-foreground">
                    Products from this brand are coming soon.
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </PageShell>
  );
}
