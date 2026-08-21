import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useSaveForLater } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { addToCart } from "@/lib/shop.functions";
import { formatINR } from "@/lib/format";
import { formatShopError } from "@/lib/auth-session";

export const Route = createFileRoute("/_authenticated/saved-items")({
  head: () => ({
    meta: [
      { title: "Saved for Later — Sri Mahalakshmi Stores" },
      { name: "description", content: "Items you saved to buy later." },
    ],
  }),
  component: SavedItemsPage,
});

function SavedItemsPage() {
  const hydrated = useHydrated();
  const items = useSaveForLater((s) => s.items);
  const remove = useSaveForLater((s) => s.remove);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (productId: string) => addToCart({ data: { productId, quantity: 1 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Moved to cart");
    },
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  if (!hydrated) {
    return (
      <PageShell>
        <TopBar title="Saved for later" />
        <div className="mt-4 space-y-3 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell>
        <TopBar title="Saved for later" />
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="No saved items"
          description="Tap Save for later on any product or move items from your cart here."
          action={
            <Link to="/categories">
              <Button className="rounded-xl">Start shopping</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar title="Saved for later" subtitle={`${items.length} item${items.length !== 1 ? "s" : ""}`} />

      <div className="space-y-3 px-4 pb-8 pt-4">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <Link to="/product/$slug" params={{ slug: p.slug }} className="shrink-0">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-accent-soft">
                {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/product/$slug" params={{ slug: p.slug }}>
                <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
              </Link>
              <p className="text-sm font-bold text-primary">{formatINR(p.price)}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={addMutation.isPending}
                onClick={() => {
                  addMutation.mutate(p.id);
                  remove(p.id);
                }}
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                Add
              </Button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="flex items-center justify-center gap-1 text-[10px] text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
