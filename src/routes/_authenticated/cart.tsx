import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Minus, Plus, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-shop";
import { useStorefront } from "@/hooks/use-storefront";
import { addToCart, removeCartItem, setCartQuantity } from "@/lib/shop.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/format";
import { cartSubtotal, computeTotals, couponError } from "@/lib/commerce";
import { useAppliedCoupon, useSaveForLater } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

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
  const add = useServerFn(addToCart);
  const { settings, coupons } = useStorefront();
  const { code: appliedCode, apply, clear: clearCoupon } = useAppliedCoupon();
  const saveLater = useSaveForLater();
  const hydrated = useHydrated();
  const [codeInput, setCodeInput] = useState("");

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
  const moveBackMutation = useMutation({
    mutationFn: (productId: string) => add({ data: { productId, quantity: 1 } }),
    onSuccess: () => {
      invalidate();
      toast.success("Moved to cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = lines ?? [];
  const subtotal = cartSubtotal(items);
  const coupon = coupons.find((c) => c.code === appliedCode) ?? null;
  const totals = computeTotals({ subtotal, coupon, settings });
  const couponIssue = coupon ? couponError(coupon, subtotal) : null;

  function applyCode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const match = coupons.find((c) => c.code === code);
    if (!match) {
      toast.error("That coupon code isn't valid.");
      return;
    }
    const issue = couponError(match, subtotal);
    if (issue) {
      toast.error(issue);
      return;
    }
    apply(code);
    setCodeInput("");
    toast.success(`${code} applied`);
  }

  return (
    <PageShell withCartBar={false}>
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
          {totals.amountToFreeDelivery > 0 && (
            <div className="mx-4 mt-4 rounded-2xl bg-primary-soft p-3">
              <p className="text-xs font-medium text-primary">
                Add {formatINR(totals.amountToFreeDelivery)} more for free delivery
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (subtotal / settings.free_delivery_above) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

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
                  <button
                    type="button"
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                    onClick={() => {
                      saveLater.toggle(line.product);
                      removeMutation.mutate(line.id);
                    }}
                  >
                    <Bookmark className="h-3 w-3" /> Save for later
                  </button>
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

          <section className="px-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Tag className="h-4 w-4 text-accent" /> Coupons
            </h2>
            {coupon && !couponIssue ? (
              <div className="flex items-center justify-between rounded-2xl border border-primary bg-primary-soft p-3">
                <div>
                  <p className="text-sm font-bold text-primary">{coupon.code} applied</p>
                  <p className="text-xs text-primary/80">
                    You saved {formatINR(totals.discount)}
                    {coupon.discount_type === "free_shipping" ? " on delivery" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove coupon"
                  onClick={() => clearCoupon()}
                  className="grid h-8 w-8 place-items-center rounded-full bg-card"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                {couponIssue && <p className="mb-2 text-xs text-destructive">{couponIssue}</p>}
                <div className="flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                    className="rounded-xl"
                  />
                  <Button className="rounded-xl" onClick={() => applyCode(codeInput)}>
                    Apply
                  </Button>
                </div>
              </>
            )}

            {coupons.length > 0 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {coupons.map((c) => {
                  const issue = couponError(c, subtotal);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyCode(c.code)}
                      className={cn(
                        "w-56 shrink-0 rounded-2xl border border-dashed border-border bg-card p-3 text-left",
                        issue && "opacity-60",
                      )}
                    >
                      <p className="text-sm font-bold tracking-wide">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      {issue && <p className="mt-1 text-[11px] text-destructive">{issue}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {hydrated && saveLater.items.length > 0 && (
            <section className="mt-6 px-4">
              <h2 className="mb-2 text-sm font-semibold">Saved for later</h2>
              <div className="space-y-2">
                {saveLater.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatINR(p.price)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        saveLater.remove(p.id);
                        moveBackMutation.mutate(p.id);
                      }}
                    >
                      Move to cart
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mx-4 mt-6 rounded-2xl border border-border bg-card p-4 text-sm card-elevated">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatINR(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between py-1 text-primary">
                <span>Coupon discount</span>
                <span className="font-medium">−{formatINR(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">
                {totals.deliveryFee === 0 ? "FREE" : formatINR(totals.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Taxes &amp; charges</span>
              <span className="font-medium">{formatINR(totals.tax)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatINR(totals.total)}</span>
            </div>
          </div>

          <div className="p-4">
            <Button asChild className="h-12 w-full rounded-xl text-base">
              <Link to="/checkout">Proceed to checkout · {formatINR(totals.total)}</Link>
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
