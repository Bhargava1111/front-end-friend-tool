import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Ticket, Check, Copy, ChevronRight, Clock, Truck, ShieldCheck, RefreshCcw, Leaf } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "./product-card";
import { Reveal } from "./motion";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentlyViewed } from "@/lib/client-store";
import { BRANDS, COUPONS, OFFER_CARDS, flashSaleEndsAt } from "@/lib/mock-content";
import { useStorefront } from "@/hooks/use-storefront";
import { couponLabel } from "@/lib/commerce";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Banner, Product } from "@/lib/types";

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

export function SeeAll({ to, tone = "primary" }: { to: string; tone?: "primary" | "onDark" }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex shrink-0 items-center gap-0.5 text-xs font-semibold",
        tone === "onDark" ? "text-primary-foreground/90" : "text-primary",
      )}
    >
      See all <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
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
          <div className="flex items-center gap-2">
            <CountdownPill />
            <SeeAll to="/deals" tone="onDark" />
          </div>
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
  const { coupons } = useStorefront();
  const list = coupons.length
    ? coupons.slice(0, 8).map((c) => ({
        code: c.code,
        title: c.title,
        description: c.description ?? "Apply at checkout",
        discount: couponLabel(c),
        minOrder: Number(c.min_order),
      }))
    : COUPONS;

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Ticket className="h-4.5 w-4.5 text-accent" /> Coupons for you
        </h2>
        <SeeAll to="/coupons" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {list.map((c) => (
          <div
            key={c.code}
            className="w-[230px] shrink-0 rounded-2xl border border-dashed border-accent/60 bg-accent-soft/70 p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
              {c.discount}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{c.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Min {formatINR(c.minOrder)}</span>
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
                {copied === c.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
  const { brands } = useStorefront();
  const list = brands.length
    ? brands.map((b) => ({
        key: b.id,
        name: b.name,
        tagline: b.tagline ?? "Trusted brand",
        logo: b.logo_url,
        initials: b.name.slice(0, 2).toUpperCase(),
      }))
    : BRANDS.map((b) => ({ key: b.name, name: b.name, tagline: b.tagline, logo: null, initials: b.initials }));
  const brandScrollRef = useAutoScroll<HTMLDivElement>(list.length > 3);

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">Featured brands</h2>
        <SeeAll to="/brands" />
      </div>
      <div ref={brandScrollRef} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {list.map((b) => (
          <Link
            key={b.key}
            to="/brands"
            className="flex w-[128px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center card-elevated transition-transform active:scale-[0.97]"
          >
            {b.logo ? (
              <img
                src={b.logo}
                alt={b.name}
                loading="lazy"
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {b.initials}
              </span>
            )}
            <span className="line-clamp-1 text-xs font-semibold text-foreground">{b.name}</span>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{b.tagline}</span>
          </Link>
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
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">Recently viewed</h2>
        <SeeAll to="/search" />
      </div>
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

/** Secondary offer-banner carousel (compact, wide cards). */
export function OfferBannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useAutoScroll<HTMLDivElement>(banners.length > 1);
  if (banners.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">Offers &amp; festive picks</h2>
        <SeeAll to="/offers" />
      </div>
      <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {banners.map((b) => {
          const body = (
            <div className="relative h-[120px] w-[280px] shrink-0 overflow-hidden rounded-2xl card-elevated">
              <img src={b.image_url} alt={b.title} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex w-2/3 flex-col justify-center p-4">
                <p className="text-sm font-bold leading-tight text-background">{b.title}</p>
                {b.subtitle && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-background/80">{b.subtitle}</p>
                )}
              </div>
            </div>
          );
          return b.link_slug ? (
            <Link key={b.id} to="/category/$slug" params={{ slug: b.link_slug }} className="shrink-0">
              {body}
            </Link>
          ) : (
            <div key={b.id} className="shrink-0">
              {body}
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

/** Single hero deal with a live countdown. */
export function DealOfTheDay({ products }: { products: Product[] }) {
  const hydrated = useHydrated();
  const [h, m, s] = useCountdown(flashSaleEndsAt());
  const deal = [...products]
    .filter((p) => p.mrp && Number(p.mrp) > Number(p.price) && p.stock > 0)
    .sort(
      (a, b) =>
        (Number(b.mrp) - Number(b.price)) / Number(b.mrp) -
        (Number(a.mrp) - Number(a.price)) / Number(a.mrp),
    )[0];
  if (!deal) return null;
  const off = Math.round(((Number(deal.mrp) - Number(deal.price)) / Number(deal.mrp)) * 100);

  return (
    <Reveal className="mt-7 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Deal of the day</h2>
        <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary">
          {hydrated ? `${h}:${m}:${s}` : "--:--:--"}
        </span>
        <SeeAll to="/deals" />
        </div>
      </div>
      <Link
        to="/product/$slug"
        params={{ slug: deal.slug }}
        className="mt-3 flex items-center gap-4 rounded-3xl border border-border bg-card p-3 card-elevated transition-transform active:scale-[0.99]"
      >
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-secondary">
          {deal.image_url && (
            <img src={deal.image_url} alt={deal.name} loading="lazy" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            {off}% OFF
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{deal.name}</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatINR(deal.price)}{" "}
            <span className="text-xs font-normal text-muted-foreground line-through">
              {formatINR(deal.mrp!)}
            </span>
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>
    </Reveal>
  );
}

/** Tabbed rail that filters products by category, like festival collections. */
export function FestivalPicks({
  categories,
  products,
  title = "Festive store",
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  products: Product[];
  title?: string;
}) {
  const tabs = categories.slice(0, 6);
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const ref = useAutoScroll<HTMLDivElement>(false);
  if (tabs.length === 0) return null;
  const list = products.filter((p) => p.category_id === (active || tabs[0].id)).slice(0, 10);

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <SeeAll to="/offers" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            aria-pressed={active === t.id}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
              active === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="px-4 pt-3 text-xs text-muted-foreground">More items coming soon.</p>
      ) : (
        <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} className="w-[150px] shrink-0" />
          ))}
        </div>
      )}
    </Reveal>
  );
}

/** Budget store rail — everything under a price ceiling. */
export function BudgetRail({ products, ceiling = 99 }: { products: Product[]; ceiling?: number }) {
  const items = products.filter((p) => Number(p.price) <= ceiling).slice(0, 12);
  const ref = useAutoScroll<HTMLDivElement>(items.length > 3);
  if (items.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-accent-soft to-accent-soft/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-accent-foreground">Under {formatINR(ceiling)} store</h2>
          <SeeAll to="/deals" />
        </div>
        <p className="mt-0.5 text-xs text-accent-foreground/75">Small basket, big savings</p>
        <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} className="w-[142px] shrink-0" />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/** Shop-by-need tiles that deep-link into categories. */
export function ShopByNeed({ categories }: { categories: Array<{ id: string; name: string; slug: string; image_url: string | null }> }) {
  const tiles = categories.slice(0, 6);
  if (tiles.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">Shop by need</h2>
        <SeeAll to="/categories" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 px-4">
        {tiles.map((c) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="overflow-hidden rounded-2xl border border-border bg-card transition-transform active:scale-[0.97]"
          >
            <div className="aspect-[4/3] w-full bg-secondary">
              {c.image_url && (
                <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="line-clamp-2 px-2 py-2 text-[11px] font-semibold leading-tight text-foreground">
              {c.name}
            </p>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

/** Static trust / service promises strip. */
export function ServicePromises() {
  const items = [
    { icon: Truck, label: "60-min delivery" },
    { icon: ShieldCheck, label: "100% authentic" },
    { icon: RefreshCcw, label: "Easy returns" },
    { icon: Leaf, label: "Farm fresh" },
  ];
  return (
    <Reveal className="mt-7 grid grid-cols-4 gap-2 px-4">
      {items.map((i) => (
        <div
          key={i.label}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-1 py-3 text-center"
        >
          <i.icon className="h-4.5 w-4.5 text-primary" />
          <span className="text-[10px] font-semibold leading-tight text-muted-foreground">{i.label}</span>
        </div>
      ))}
    </Reveal>
  );
}
