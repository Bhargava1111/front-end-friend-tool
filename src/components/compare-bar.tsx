import { Link } from "@tanstack/react-router";
import { GitCompareArrows, X } from "lucide-react";
import { useCompareList } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function CompareBar() {
  const hydrated = useHydrated();
  const items = useCompareList((s) => s.items);
  const remove = useCompareList((s) => s.remove);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:px-0">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-lg">
        <div className="flex -space-x-2">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <div className="h-9 w-9 overflow-hidden rounded-lg border-2 border-card bg-accent-soft">
                {p.image_url && (
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-destructive text-destructive-foreground"
                aria-label="Remove from compare"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} to compare
          </p>
          <p className="text-[10px] text-muted-foreground">Add up to 4 products</p>
        </div>
        <Link
          to="/compare"
          className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Compare
        </Link>
      </div>
    </div>
  );
}
