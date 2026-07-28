import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-shop";
import { removeCartItem, setCartQuantity } from "@/lib/shop.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { formatINR, DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Sri Mahalakshmi Stores" },
      { name: "description", content: "Review the groceries and pooja items in your cart." },
      { property: "og:title", content: "Your Cart — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Review your cart before checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { data: lines, isLoading } = useCart();
  const queryClient = useQueryClient();
  const setQty = useServerFn(setCartQuantity);
  const remove = useServerFn(removeCartItem);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart"] });

  const qtyMutation = useMutation({
    mutationFn: (v: { itemId: string; quantity: number }) => setQty({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => remove({ data: { itemId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = lines ?? [];
  const subtotal = items.reduce((s, l) => s + Number(l.product.price) * l.quantity, 0);
  const delivery = subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0 ? 0 : DELIVERY_FEE;

  return (
    <PageShell>
      <TopBar title="Your Cart" subtitle={`${items.length} item${items.length === 1 ? "" : "s"}`} />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Add fresh groceries and pooja essentials to get started."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/categories">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 p-4">
            {items.map((line) => (
              <div
                key={line.id}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 card-elevated"
              >
                <Link
                  to="/product/$slug"
                  params={{ slug: line.product.slug }}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary"
                >
                  {line.product.image_url && (
                    <img
                      src={line.product.image_url}
                      alt={line.product.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold">{line.product.name}</h3>
                  {line.product.weight && (
                    <p className="text-xs text-muted-foreground">{line.product.weight}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {formatINR(Number(line.product.price) * line.quantity)}
                    </span>
                    <div className="flex items-center gap-1.5 rounded-full border border-border p-0.5">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="grid h-7 w-7 place-items-center rounded-full bg-secondary"
                        onClick={() =>
                          qtyMutation.mutate({ itemId: line.id, quantity: line.quantity - 1 })
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"
                        onClick={() =>
                          qtyMutation.mutate({ itemId: line.id, quantity: line.quantity + 1 })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove item"
                  className="self-start text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(line.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mx-4 rounded-2xl border border-border bg-card p-4 text-sm card-elevated">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">{delivery === 0 ? "FREE" : formatINR(delivery)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatINR(subtotal + delivery)}</span>
            </div>
            {delivery > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Add {formatINR(FREE_DELIVERY_ABOVE - subtotal)} more for free delivery.
              </p>
            )}
          </div>

          <div className="p-4">
            <Button asChild className="h-12 w-full rounded-xl text-base">
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
