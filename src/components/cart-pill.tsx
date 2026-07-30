import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUp, ShoppingCart, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-shop";
import { useStorefront } from "@/hooks/use-storefront";
import { cartSubtotal } from "@/lib/commerce";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Sticky free-delivery progress strip + floating cart pill, docked above the
 * bottom navigation.
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

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[68px] z-40 mx-auto w-full max-w-lg px-3">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-md card-elevated">
        <div className="px-3.5 pt-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Truck className="h-3.5 w-3.5 text-primary" />
            {remaining > 0 ? (
              <>
                Add <span className="text-primary">{formatINR(remaining)}</span> more to unlock free
                delivery
              </>
            ) : (
              <span className="text-primary">Free delivery unlocked</span>
            )}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <Link
          to="/cart"
          className="mt-2.5 flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4" />
            {count} item{count > 1 ? "s" : ""} · {formatINR(subtotal)}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide">View cart</span>
        </Link>
      </div>
    </div>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
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
        "fixed bottom-[150px] right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground card-elevated transition-all",
        show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
