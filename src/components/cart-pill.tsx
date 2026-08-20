import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUp, ChevronRight, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-shop";
import { useStorefront } from "@/hooks/use-storefront";
import { cartSubtotal } from "@/lib/commerce";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const CART_BAR_BOTTOM = "calc(4.75rem + env(safe-area-inset-bottom, 0px))";

/**
 * Sticky free-delivery progress + view-cart CTA, docked above the bottom nav.
 */
export function StickyCartBar() {
  const { data: lines } = useCart();
  const { settings } = useStorefront();
  const items = lines ?? [];
  const count = items.reduce((n, l) => n + l.quantity, 0);
  if (count === 0) return null;

  const subtotal = cartSubtotal(items);
  const threshold = Number(settings.free_delivery_above) || 0;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = threshold ? Math.min(100, (subtotal / threshold) * 100) : 100;
  const preview = items
    .map((l) => l.product?.image_url)
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 mx-auto w-full max-w-lg px-3"
      style={{ bottom: CART_BAR_BOTTOM }}
    >
      <div className="pointer-events-auto overflow-hidden rounded-[1.35rem] bg-card shadow-[0_10px_32px_rgba(15,23,42,0.22)] ring-1 ring-black/10">
        <div className="flex items-center gap-2 px-3.5 py-2">
          <Truck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
            {remaining > 0 ? (
              <>
                Add <span className="text-primary">{formatINR(remaining)}</span> more for free delivery
              </>
            ) : (
              <span className="text-primary">Free delivery unlocked</span>
            )}
          </p>
          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Link
          to="/cart"
          className="mx-2 mb-2 flex items-center gap-3 rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground transition-transform active:scale-[0.99]"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            {preview.length > 0 ? (
              <span className="flex">
                {preview.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className={cn(
                      "h-10 w-10 rounded-full border-2 border-primary object-cover",
                      i > 0 && "-ml-3",
                    )}
                    style={{ zIndex: preview.length - i }}
                  />
                ))}
              </span>
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/15">
                <ShoppingBag className="h-5 w-5" />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[15px] font-bold leading-tight">View cart</span>
            <span className="mt-0.5 block text-xs font-medium text-primary-foreground/80">
              {count} item{count > 1 ? "s" : ""} · {formatINR(subtotal)}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary-foreground px-3 py-1.5 text-xs font-bold text-primary">
            Go
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  const { data: lines } = useCart();
  const cartOpen = (lines ?? []).some((l) => l.quantity > 0);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground card-elevated transition-all",
        cartOpen
          ? "bottom-[calc(13.25rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
        show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
