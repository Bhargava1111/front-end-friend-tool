import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompareArrows, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useCompareList } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSession } from "@/hooks/use-shop";
import { addToCart } from "@/lib/shop.functions";
import { formatINR } from "@/lib/format";
import { formatShopError } from "@/lib/auth-session";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Products — Sri Mahalakshmi Stores" },
      { name: "description", content: "Compare up to 4 groceries and pooja products side by side." },
    ],
  }),
  component: ComparePage,
});

const ROWS: Array<{ key: string; label: string; get: (p: Product) => string }> = [
  { key: "price", label: "Price", get: (p) => formatINR(p.price) },
  {
    key: "mrp",
    label: "MRP",
    get: (p) => (p.mrp ? formatINR(p.mrp) : "—"),
  },
  {
    key: "discount",
    label: "Discount",
    get: (p) => {
      if (!p.mrp || Number(p.mrp) <= Number(p.price)) return "—";
      return `${Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100)}%`;
    },
  },
  { key: "weight", label: "Pack size", get: (p) => p.weight ?? "—" },
  { key: "brand", label: "Brand", get: (p) => p.brand_name ?? "—" },
  { key: "category", label: "Category", get: (p) => p.category_name ?? "—" },
  {
    key: "stock",
    label: "Availability",
    get: (p) => ((p.stock ?? 0) > 0 ? "In stock" : "Out of stock"),
  },
  {
    key: "rating",
    label: "Rating",
    get: (p) => (p.avg_rating ? `${Number(p.avg_rating).toFixed(1)} ★` : "—"),
  },
];

function ComparePage() {
  const hydrated = useHydrated();
  const items = useCompareList((s) => s.items);
  const remove = useCompareList((s) => s.remove);
  const clear = useCompareList((s) => s.clear);
  const { session } = useSession();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (productId: string) => addToCart({ data: { productId, quantity: 1 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  if (!hydrated) {
    return (
      <PageShell withCartBar={false}>
        <TopBar title="Compare" backTo="/" />
        <div className="mt-6 h-48 animate-pulse rounded-2xl bg-card mx-4" />
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell withCartBar={false}>
        <TopBar title="Compare products" backTo="/" />
        <EmptyState
          icon={<GitCompareArrows className="h-6 w-6" />}
          title="Nothing to compare"
          description="Tap Compare on any product page to add it here. You can compare up to 4 items."
          action={
            <Link to="/categories">
              <Button className="rounded-xl">Browse products</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell withCartBar={false}>
      <TopBar
        title="Compare products"
        subtitle={`${items.length} of 4 selected`}
        backTo="/"
        action={
          <button type="button" onClick={() => clear()} className="text-xs font-medium text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        }
      />

      <div className="overflow-x-auto px-4 pb-8 lg:px-0">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background p-2 text-left text-xs font-medium text-muted-foreground" />
              {items.map((p) => (
                <th key={p.id} className="min-w-[140px] p-2 text-center">
                  <div className="relative mx-auto w-[120px]">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="absolute -right-1 -top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <Link to="/product/$slug" params={{ slug: p.slug }}>
                      <div className="mx-auto h-24 w-24 overflow-hidden rounded-xl bg-accent-soft">
                        {p.image_url && (
                          <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold text-foreground">{p.name}</p>
                    </Link>
                  </div>
                </th>
              ))}
              {items.length < 4 && (
                <th className="min-w-[100px] p-2">
                  <Link
                    to="/categories"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-8 text-muted-foreground"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">Add product</span>
                  </Link>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-background p-2 text-xs font-medium text-muted-foreground">
                  {row.label}
                </td>
                {items.map((p) => (
                  <td key={p.id} className="p-2 text-center text-xs font-medium text-foreground">
                    {row.get(p)}
                  </td>
                ))}
                {items.length < 4 && <td />}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="sticky left-0 z-10 bg-background p-2" />
              {items.map((p) => (
                <td key={p.id} className="p-2 text-center">
                  <Button
                    size="sm"
                    className="rounded-xl text-xs"
                    disabled={!session || addMutation.isPending}
                    onClick={() => {
                      if (!session) {
                        toast.error("Sign in to add to cart");
                        return;
                      }
                      addMutation.mutate(p.id);
                    }}
                  >
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </td>
              ))}
              {items.length < 4 && <td />}
            </tr>
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
