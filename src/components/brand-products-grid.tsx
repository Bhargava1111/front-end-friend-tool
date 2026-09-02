import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { cn } from "@/lib/utils";

export function BrandProductsGrid({
  name,
  products,
  className,
}: {
  name: string;
  products: Product[];
  className?: string;
}) {
  if (products.length === 0) {
    return (
      <p className={cn("px-4 py-10 text-center text-sm text-muted-foreground", className)}>
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
          className,
        )}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <ProductRail title={`From ${name}`} products={products} size="default" />
    </div>
  );
}
