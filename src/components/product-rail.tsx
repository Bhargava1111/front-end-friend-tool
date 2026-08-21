import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductRail({
  title,
  products,
  href,
  size = "default",
}: {
  title: string;
  products: Product[];
  href?: { to: string; params?: Record<string, string>; search?: Record<string, string> };
  size?: "compact" | "default" | "featured";
}) {
  if (products.length === 0) return null;
  const cardWidth =
    size === "featured"
      ? "w-[168px] shrink-0 sm:w-[200px] lg:w-[220px]"
      : size === "compact"
        ? "w-[132px] shrink-0 sm:w-[148px]"
        : "w-[150px] shrink-0 sm:w-[185px] lg:w-[205px]";
  return (
    <section className={cn(size === "featured" ? "mt-8" : size === "compact" ? "mt-4" : "mt-7")}>
      <div className="flex items-center justify-between px-4">
        <h2
          className={cn(
            "font-bold text-foreground",
            size === "featured" ? "text-lg sm:text-xl" : size === "compact" ? "text-sm" : "text-base sm:text-lg",
          )}
        >
          {title}
        </h2>
        {href && (
          <Link
            to={href.to}
            params={href.params as never}
            search={href.search as never}
            className="flex items-center gap-0.5 text-xs font-medium text-primary sm:text-sm"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div
        className={cn(
          "no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1",
          size === "compact" ? "mt-2 gap-2" : "mt-3 sm:gap-4",
        )}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className={cardWidth} />
        ))}
      </div>
    </section>
  );
}
