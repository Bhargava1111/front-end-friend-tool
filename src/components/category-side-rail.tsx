import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type RailCategory = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
};

/** Vertical category rail shown to the left of a product grid. */
export function CategorySideRail({
  categories,
  activeSlug,
}: {
  categories: RailCategory[];
  activeSlug: string;
}) {
  if (categories.length === 0) return null;
  return (
    <nav
      aria-label="Categories"
      className="no-scrollbar sticky top-[110px] max-h-[calc(100vh-140px)] w-[84px] shrink-0 overflow-y-auto border-r border-border bg-secondary/40"
    >
      <ul>
        {categories.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.id}>
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-1.5 py-3 text-center transition-colors",
                  active ? "bg-background" : "hover:bg-background/60",
                )}
              >
                <span
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-2xl border-2 bg-accent-soft",
                    active ? "border-primary" : "border-transparent",
                  )}
                >
                  {c.image_url && (
                    <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-[10px] font-semibold leading-tight",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {c.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
