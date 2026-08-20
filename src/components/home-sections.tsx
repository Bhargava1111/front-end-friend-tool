import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlacementBanners } from "@/lib/storefront.functions";
import { getCombos } from "@/lib/catalog.functions";
import { Zap, Ticket, Check, Copy, ChevronRight, Clock, Truck, ShieldCheck, RefreshCcw, Leaf, Percent, Sparkles } from "lucide-react";
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

export function SeeAll({
  to,
  search,
  params,
  tone = "primary",
}: {
  to: string;
  search?: Record<string, string>;
  params?: Record<string, string>;
  tone?: "primary" | "onDark";
}) {
  return (
    <Link
      to={to as never}
      search={search as never}
      params={params as never}
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

export function FlashSaleRail({
  products,
  curated,
}: {
  products: Product[];
  curated?: Product[];
}) {
  const deals =
    curated && curated.length > 0
      ? curated
      : products
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
            <SeeAll to="/deals" search={{ tab: "flash" }} tone="onDark" />
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
        banner: c.banner_url ?? null,
        discount: couponLabel(c),
        minOrder: Number(c.min_order),
      }))
    : COUPONS.map((c) => ({ ...c, banner: null as string | null }));

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
            className="w-[230px] shrink-0 overflow-hidden rounded-2xl border border-dashed border-accent/60 bg-accent-soft/70 sm:w-[268px]"
          >
            {c.banner && (
              <img
                src={c.banner}
                alt={c.title}
                loading="lazy"
                className="h-[86px] w-full object-cover"
              />
            )}
            <div className="p-4">
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
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function OfferCards() {
  const { data: combos = [], isLoading } = useQuery({
    queryKey: ["combo-packs"],
    queryFn: () => getCombos(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: banners = [] } = useQuery({
    queryKey: ["placement-banners", "combos"],
    queryFn: () => getPlacementBanners({ data: { placement: "combos" } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Reveal className="mt-7 grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-secondary" />
        ))}
      </Reveal>
    );
  }

  if (combos.length > 0) {
    return (
      <Reveal className="mt-7">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-base font-bold text-foreground">Combo packs</h2>
          <SeeAll to="/deals" search={{ tab: "combo" }} />
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {combos.map((product) => (
            <ProductCard key={product.id} product={product} className="w-[168px] shrink-0" />
          ))}
        </div>
      </Reveal>
    );
  }

  const bannerCombos = banners.map((b, i) => ({
    key: b.id,
    title: b.title,
    subtitle: b.subtitle ?? "",
    image: b.image_url || null,
    slug: b.product?.slug ?? b.link_slug ?? "",
    product: b.product ?? null,
    tone: i % 2 === 0 ? ("accent" as const) : ("primary" as const),
    cta: "Shop now",
  }));

  const fallback = OFFER_CARDS.map((o) => ({
    key: o.title,
    title: o.title,
    subtitle: o.subtitle,
    image: null as string | null,
    slug: o.slug,
    product: null,
    tone: o.tone,
    cta: o.cta,
  }));

  const list = bannerCombos.length ? bannerCombos : fallback;

  return (
    <Reveal className="mt-7 grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:gap-4">
      {list.map((o) => {
        const price = o.product ? Number(o.product.price) : null;
        const mrp = o.product?.mrp ? Number(o.product.mrp) : null;
        const discount =
          price && mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

        const inner = (
          <>
            {o.image && (
              <>
                <img
                  src={o.image}
                  alt={o.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
              </>
            )}
            <div className="relative">
              {discount > 0 && (
                <span className="mb-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {discount}% OFF
                </span>
              )}
              <p className="text-sm font-bold leading-tight">{o.title}</p>
              {o.subtitle && <p className="mt-1 text-[11px] opacity-80">{o.subtitle}</p>}
              {price !== null && (
                <p className="mt-2 text-sm font-bold">
                  {formatINR(price)}
                  {mrp && mrp > price && (
                    <span className="ml-1 text-[11px] font-normal line-through opacity-70">
                      {formatINR(mrp)}
                    </span>
                  )}
                </p>
              )}
            </div>
            <span className="relative mt-3 flex items-center gap-0.5 text-[11px] font-semibold">
              {o.cta} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </>
        );

        const className = cn(
          "relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.98]",
          o.image
            ? "text-white"
            : o.tone === "accent"
              ? "bg-gradient-to-br from-accent to-accent/70 text-accent-foreground"
              : "bg-gradient-to-br from-primary to-primary/75 text-primary-foreground",
        );

        const targetSlug = o.product?.slug ?? o.slug;
        if (!targetSlug) {
          return (
            <div key={o.key} className={className}>
              {inner}
            </div>
          );
        }

        return (
          <Link
            key={o.key}
            to={o.product ? "/product/$slug" : "/category/$slug"}
            params={{ slug: targetSlug }}
            className={className}
          >
            {inner}
          </Link>
        );
      })}
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
        banner: b.banner_url,
        initials: b.name.slice(0, 2).toUpperCase(),
      }))
    : BRANDS.map((b) => ({
        key: b.name,
        name: b.name,
        tagline: b.tagline,
        logo: null,
        banner: null,
        initials: b.initials,
      }));

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground sm:text-lg">Featured brands</h2>
        <SeeAll to="/brands" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:gap-4">
        {list.map((b) => (
          <Link
            key={b.key}
            to="/brands"
            className="relative flex w-[164px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-center card-elevated transition-transform active:scale-[0.97] sm:w-[200px]"
          >
            <span className="relative block h-[86px] w-full bg-secondary sm:h-[104px]">
              {b.banner ? (
                <img
                  src={b.banner}
                  alt={`${b.name} offers`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block h-full w-full bg-gradient-to-br from-primary to-primary/70" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            </span>
            <span className="-mt-6 flex flex-col items-center gap-1.5 px-3 pb-3">
              {b.logo ? (
                <img
                  src={b.logo}
                  alt={b.name}
                  loading="lazy"
                  className="h-11 w-11 rounded-full border-2 border-card object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-card bg-primary-soft text-sm font-bold text-primary">
                  {b.initials}
                </span>
              )}
              <span className="line-clamp-1 text-xs font-semibold text-foreground">{b.name}</span>
              <span className="line-clamp-1 text-[10px] text-muted-foreground">{b.tagline}</span>
            </span>
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

function BannerSlide({
  banner,
  className,
  overlayClass,
  badge,
  layout = "overlay",
}: {
  banner: Banner;
  className: string;
  overlayClass: string;
  badge?: ReactNode;
  layout?: "overlay" | "card";
}) {
  const imageBlock = banner.image_url ? (
    <img
      src={banner.image_url}
      alt={banner.title}
      loading="lazy"
      className={cn(
        "h-full w-full",
        layout === "card" ? "object-contain p-1" : "object-cover",
      )}
    />
  ) : (
    <div className="h-full w-full bg-secondary" />
  );

  const body =
    layout === "card" ? (
      <div className={cn("flex shrink-0 flex-col overflow-hidden rounded-2xl bg-card", className)}>
        <div className="aspect-[16/9] bg-secondary/80">{imageBlock}</div>
        <div className="p-3">
          {badge}
          <p className="text-sm font-bold leading-tight text-foreground">{banner.title}</p>
          {banner.subtitle && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{banner.subtitle}</p>
          )}
        </div>
      </div>
    ) : (
      <div className={cn("relative shrink-0 overflow-hidden card-elevated", className)}>
        {imageBlock}
        <div className={cn("absolute inset-0", overlayClass)} />
        <div className="absolute inset-y-0 left-0 flex w-[72%] flex-col justify-end p-4">
          {badge}
          <p className="text-sm font-bold leading-tight text-white drop-shadow-sm">{banner.title}</p>
          {banner.subtitle && (
            <p className="mt-1 line-clamp-2 text-[11px] text-white/85">{banner.subtitle}</p>
          )}
        </div>
      </div>
    );
  if (banner.link_slug) {
    return (
      <Link to="/category/$slug" params={{ slug: banner.link_slug }} className="shrink-0">
        {body}
      </Link>
    );
  }
  return <div className="shrink-0">{body}</div>;
}

/** Deal / discount banners only — not mixed with festive creatives. */
export function OfferBannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useAutoScroll<HTMLDivElement>(banners.length > 1);
  if (banners.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Percent className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Today's offers</h2>
              <p className="text-[11px] text-muted-foreground">Deals, combos and savings</p>
            </div>
          </div>
          <SeeAll to="/offers" />
        </div>
      </div>
      <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {banners.map((b) => (
          <BannerSlide
            key={b.id}
            banner={b}
            className="h-[132px] w-[270px] rounded-2xl ring-1 ring-primary/20"
            overlayClass="bg-gradient-to-r from-primary/90 via-primary/55 to-transparent"
            badge={
              <span className="mb-1.5 w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                Offer
              </span>
            }
          />
        ))}
      </div>
    </Reveal>
  );
}

/** Festival / pooja campaign banners — separate from grocery offers. */
export function FestivalBannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useAutoScroll<HTMLDivElement>(banners.length > 1);
  if (banners.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-orange-800 px-4 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-50">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400/20 text-amber-200">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold">Festival picks</h2>
              <p className="text-[11px] text-amber-100/75">Pooja kits, lamps and seasonal specials</p>
            </div>
          </div>
          <SeeAll to="/deals" search={{ tab: "festive" }} tone="onDark" />
        </div>
        <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {banners.map((b) => (
            <BannerSlide
            key={b.id}
            banner={b}
            layout="card"
            className="w-[min(82vw,300px)]"
            overlayClass=""
            badge={
              <span className="mb-1.5 w-fit rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                Festive
              </span>
            }
          />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/** Single hero deal with a live countdown. */
export function DealOfTheDay({
  products,
  curated,
}: {
  products: Product[];
  curated?: Product[];
}) {
  const hydrated = useHydrated();
  const [h, m, s] = useCountdown(flashSaleEndsAt());
  const deal =
    curated?.[0] ??
    [...products]
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
        <SeeAll to="/deals" search={{ tab: "today" }} />
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
  curated,
  title = "Festive store",
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  products: Product[];
  curated?: Product[];
  title?: string;
}) {
  const tabs = categories.slice(0, 6);
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === (active || tabs[0]?.id));
  const categoryList = products.filter((p) => p.category_id === (active || tabs[0]?.id)).slice(0, 10);
  const list = curated && curated.length > 0 ? curated : categoryList;
  const ref = useAutoScroll<HTMLDivElement>(list.length > 3);

  if (tabs.length === 0 && list.length === 0) return null;

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {curated?.length ? (
          <SeeAll to="/deals" search={{ tab: "festive" }} />
        ) : activeTab ? (
          <SeeAll to="/category/$slug" params={{ slug: activeTab.slug }} />
        ) : (
          <SeeAll to="/deals" search={{ tab: "festive" }} />
        )}
      </div>
      {!curated?.length && tabs.length > 0 && (
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
      )}
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
export function BudgetRail({
  products,
  curated,
  ceiling = 99,
}: {
  products: Product[];
  curated?: Product[];
  ceiling?: number;
}) {
  const items =
    curated && curated.length > 0
      ? curated.slice(0, 12)
      : products.filter((p) => Number(p.price) <= ceiling).slice(0, 12);
  const ref = useAutoScroll<HTMLDivElement>(items.length > 3);
  if (items.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-accent-soft to-accent-soft/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-accent-foreground">Under {formatINR(ceiling)} store</h2>
          <SeeAll to="/deals" search={{ tab: "budget" }} />
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
      <div className="mt-3 grid grid-cols-3 gap-3 px-4 sm:grid-cols-4 lg:grid-cols-6">
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
    <Reveal className="mt-7 grid grid-cols-4 gap-2 px-4 sm:grid-cols-6 lg:grid-cols-8">
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
