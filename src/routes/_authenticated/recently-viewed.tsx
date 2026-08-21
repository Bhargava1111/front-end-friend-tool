import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Trash2, Eye } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { useRecentlyViewed } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/_authenticated/recently-viewed")({
  head: () => ({
    meta: [
      { title: "Recently Viewed — Sri Mahalakshmi Stores" },
      { name: "description", content: "Products you've browsed recently." },
    ],
  }),
  component: RecentlyViewedPage,
});

function RecentlyViewedPage() {
  const hydrated = useHydrated();
  const items = useRecentlyViewed((s) => s.items);
  const clear = useRecentlyViewed((s) => s.clear);

  if (!hydrated) {
    return (
      <PageShell>
        <TopBar title="Recently viewed" subtitle="Your browsing history" />
        <div className="mt-6 grid grid-cols-2 gap-3 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar
        title="Recently viewed"
        subtitle={`${items.length} product${items.length !== 1 ? "s" : ""}`}
        action={
          items.length > 0 ? (
            <button
              type="button"
              onClick={() => clear()}
              className="flex items-center gap-1 text-xs font-medium text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-6 w-6" />}
          title="Nothing here yet"
          description="Products you browse will appear here so you can find them quickly."
          action={
            <Link to="/categories">
              <Button className="rounded-xl">Browse categories</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Reveal className="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Showing your last {items.length} viewed product{items.length !== 1 ? "s" : ""}
            </p>
          </Reveal>

          <Reveal className="mt-4 grid grid-cols-2 gap-3 px-4 pb-8 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Reveal>
        </>
      )}
    </PageShell>
  );
}
