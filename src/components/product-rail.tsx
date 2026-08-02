import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/types";

export function ProductRail({
  title,
  products,
  href,
}: {
  title: string;
  products: Product[];
  href?: { to: string; params?: Record<string, string> };
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
        {href && (
          <Link
            to={href.to}
            params={href.params as never}
            className="flex items-center gap-0.5 text-xs font-medium text-primary sm:text-sm"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            className="w-[150px] shrink-0 sm:w-[185px] lg:w-[205px]"
          />
        ))}
      </div>
    </section>
  );
}
