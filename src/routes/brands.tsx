import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { getBrandDirectory } from "@/lib/storefront.functions";
import { brandSectionId, resolveBrandFromParam } from "@/lib/banner-routing";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { Reveal } from "@/components/motion";
import { brandGradient, brandInitials, brandRailVisual } from "@/lib/brand-ui";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/brands")({
  validateSearch: (search: Record<string, unknown>) => ({
    brand: typeof search.brand === "string" && search.brand.trim() ? search.brand.trim() : undefined,
  }),
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

function BrandProducts({ name, products }: { name: string; products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Products from this brand are coming soon.
      </p>
    );
  }

  if (products.length <= 4) {
    return (
      <div
        className={cn(
          "mx-auto grid max-w-4xl gap-4 p-4",
          products.length === 1
            ? "max-w-[220px] grid-cols-1"
            : products.length === 2
              ? "max-w-2xl grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-full" />
        ))}
      </div>
    );
  }

  return <ProductRail title={`From ${name}`} products={products} size="default" />;
}

function scrollToBrandSection(targetId: string) {
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tryScroll = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    attempts += 1;
    if (attempts < 30) {
      timer = setTimeout(tryScroll, 100);
    }
  };

  requestAnimationFrame(tryScroll);

  return () => {
    if (timer) clearTimeout(timer);
  };
}

function BrandsPage() {
  const { brand: brandParam } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["brand-directory"],
    queryFn: () => getBrandDirectory(),
  });

  const selectedBrand = useMemo(
    () => resolveBrandFromParam(data?.brands ?? [], brandParam),
    [brandParam, data?.brands],
  );

  useEffect(() => {
    if (isLoading || !selectedBrand) return;
    return scrollToBrandSection(brandSectionId(selectedBrand.id));
  }, [isLoading, selectedBrand]);

  return (
    <PageShell>
      <TopBar title="Featured brands" subtitle="Trusted names, curated ranges" backTo="/" />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : !data || data.brands.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No brands yet"
          description="Brands will appear here once the store adds them."
        />
      ) : (
        <div className="space-y-4 pb-28">
          {data.brands.map((b, i) => {
            const visual = brandRailVisual(b.logo_url);
            const isSelected = selectedBrand?.id === b.id;
            return (
              <Reveal key={b.id} delay={i * 0.03}>
                <article
                  id={brandSectionId(b.id)}
                  className={cn(
                    "mx-4 overflow-hidden rounded-3xl border bg-card shadow-sm scroll-mt-24",
                    isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 text-white sm:px-5",
                      visual.type === "logo" ? "bg-gradient-to-r from-primary to-primary/85" : `bg-gradient-to-r ${brandGradient(b.name)}`,
                    )}
                  >
                    {visual.type === "logo" ? (
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/95 p-1.5 shadow-sm">
                        <img
                          src={visual.src}
                          alt={b.name}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 text-lg font-bold backdrop-blur-sm">
                        {brandInitials(b.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-tight">{b.name}</h2>
                      <p className="mt-0.5 text-sm text-white/85">{b.tagline ?? "Trusted brand"}</p>
                      {b.products.length > 0 && (
                        <p className="mt-1 text-xs text-white/70">
                          {b.products.length} product{b.products.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <BrandProducts name={b.name} products={b.products} />
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
