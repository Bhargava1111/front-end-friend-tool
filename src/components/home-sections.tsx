import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Ticket, Check, Copy, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "./product-card";
import { Reveal } from "./motion";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentlyViewed } from "@/lib/client-store";
import { BRANDS, COUPONS, OFFER_CARDS, flashSaleEndsAt } from "@/lib/mock-content";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

function useCountdown(target: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, "0"));
}

function CountdownPill() {
  const hydrated = useHydrated();
  const [h, m, s] = useCountdown(flashSaleEndsAt());
  return (
    <span className="flex items-center gap-1 rounded-full bg-background/25 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary-foreground backdrop-blur">
      <Clock className="h-3 w-3" />
      {hydrated ? `${h}:${m}:${s}` : "--:--:--"}
    </span>
  );
}

export function FlashSaleRail({ products }: { products: Product[] }) {
  const deals = products
    .filter((p) => p.mrp && Number(p.mrp) > Number(p.price))
    .sort(
      (a, b) =>
        (Number(b.mrp) - Number(b.price)) / Number(b.mrp) -
        (Number(a.mrp) - Number(a.price)) / Number(a.mrp),
    )
    .slice(0, 10);
  const dealsScrollRef = useAutoScroll<HTMLDivElement>(deals.length > 3);

  if (deals.length === 0) return null;

  return (
    <Reveal className="mt-7">
      <div className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 pb-4 pt-4 card-elevated">
        <div className="flex items-center justify-between px-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-primary-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
              <Zap className="h-4 w-4" />
            </span>
            Flash Sale
          </h2>
          <CountdownPill />
        </div>
        <p className="mt-1 px-4 text-xs text-primary-foreground/70">
          Ends at midnight — grab them before they're gone
        </p>
        <div
          ref={dealsScrollRef}
          className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1"
        >
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} className="w-[150px] shrink-0" />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export function CouponStrip() {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Ticket className="h-4.5 w-4.5 text-accent" /> Coupons for you
        </h2>
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {COUPONS.map((c) => (
          <div
            key={c.code}
            className="w-[230px] shrink-0 rounded-2xl border border-dashed border-accent/60 bg-accent-soft/70 p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
              {c.discount}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{c.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Min {formatINR(c.minOrder)}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(c.code);
                  setCopied(c.code);
                  toast.success(`Coupon ${c.code} copied`);
                  setTimeout(() => setCopied(null), 1600);
                }}
                className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[11px] font-bold text-primary"
              >
                {copied === c.code ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {c.code}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function OfferCards() {
  return (
    <Reveal className="mt-7 grid grid-cols-2 gap-3 px-4">
      {OFFER_CARDS.map((o) => (
        <Link
          key={o.title}
          to="/category/$slug"
          params={{ slug: o.slug }}
          className={cn(
            "flex flex-col justify-between rounded-3xl p-4 transition-transform active:scale-[0.98]",
            o.tone === "accent"
              ? "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground"
              : "bg-gradient-to-br from-primary to-primary/75 text-primary-foreground",
          )}
        >
          <div>
            <p className="text-sm font-bold leading-tight">{o.title}</p>
            <p className="mt-1 text-[11px] opacity-80">{o.subtitle}</p>
          </div>
          <span className="mt-5 flex items-center gap-0.5 text-[11px] font-semibold">
            {o.cta} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </Reveal>
  );
}

export function BrandRail() {
  const brandScrollRef = useAutoScroll<HTMLDivElement>(BRANDS.length > 3);
  return (
    <Reveal className="mt-7">
      <h2 className="px-4 text-base font-bold text-foreground">Featured brands</h2>
      <div
        ref={brandScrollRef}
        className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1"
      >
        {BRANDS.map((b) => (
          <div
            key={b.name}
            className="flex w-[128px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center card-elevated"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {b.initials}
            </span>
            <span className="text-xs font-semibold text-foreground">{b.name}</span>
            <span className="text-[10px] text-muted-foreground">{b.tagline}</span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function RecentlyViewedRail() {
  const hydrated = useHydrated();
  const items = useRecentlyViewed((s) => s.items);
  const recentScrollRef = useAutoScroll<HTMLDivElement>(items.length > 3);
  if (!hydrated || items.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <h2 className="px-4 text-base font-bold text-foreground">Recently viewed</h2>
      <div
        ref={recentScrollRef}
        className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1"
      >
        {items.map((p) => (
          <ProductCard key={p.id} product={p} className="w-[150px] shrink-0" />
        ))}
      </div>
    </Reveal>
  );
}
