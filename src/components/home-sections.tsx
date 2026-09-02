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
import type { HomeSectionBlock } from "@/lib/offer-sections";
import { homeSectionDisplaySize, sortHomeSections } from "@/lib/offer-sections";
import { resolveHomeSectionBlockProducts, type HomeCatalogData } from "@/lib/offer-section-products";
import { brandGradient, brandInitials, brandRailVisual } from "@/lib/brand-ui";
import { brandLinkTarget, resolveBannerLink } from "@/lib/banner-routing";
import { ProductRail } from "./product-rail";

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
  title = "Flash Sale",
  subtitle = "Ends at midnight — grab them before they're gone",
}: {
  products: Product[];
  curated?: Product[];
  title?: string;
  subtitle?: string;
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
    <Reveal className="mt-8">
      <div className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 pb-4 pt-4 card-elevated">
        <div className="flex items-center justify-between px-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-primary-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
              <Zap className="h-4 w-4" />
            </span>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <CountdownPill />
            <SeeAll to="/deals" search={{ tab: "flash" }} tone="onDark" />
          </div>
        </div>
        <p className="mt-1 px-4 text-xs text-primary-foreground/70">
          {subtitle}
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

export function CouponStrip({ title = "Coupons for you" }: { title?: string }) {
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
    <Reveal className="mt-4">
      <div className="flex items-center justify-between px-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ticket className="h-3.5 w-3.5 text-accent" /> {title}
        </h2>
        <SeeAll to="/coupons" />
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {list.map((c) => (
          <div
            key={c.code}
            className="w-[188px] shrink-0 overflow-hidden rounded-xl border border-dashed border-accent/50 bg-accent-soft/60 sm:w-[210px]"
          >
            {c.banner && (
              <img
                src={c.banner}
                alt={c.title}
                loading="lazy"
                className="h-[52px] w-full object-cover"
              />
            )}
            <div className="p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              {c.discount}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-foreground">{c.title}</p>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{c.description}</p>
            <div className="mt-2 flex items-center justify-between gap-1">
              <span className="text-[10px] text-muted-foreground">Min {formatINR(c.minOrder)}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(c.code);
                  setCopied(c.code);
                  toast.success(`Coupon ${c.code} copied`);
                  setTimeout(() => setCopied(null), 1600);
                }}
                className="flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[10px] font-bold text-primary"
              >
                {copied === c.code ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
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

export function OfferCards({ embedded = false }: { embedded?: boolean }) {
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
      <div className={cn("no-scrollbar flex gap-2 overflow-x-auto", embedded ? "mt-2" : "px-4")}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] w-[148px] shrink-0 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (combos.length > 0) {
    return (
      <div className={cn("no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5", !embedded && "px-4")}>
        {combos.map((product) => (
          <ProductCard key={product.id} product={product} className="w-[132px] shrink-0" />
        ))}
      </div>
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
    <div className={cn("no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5", !embedded && "px-4")}>
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
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
              </>
            )}
            <div className="relative min-w-0">
              {discount > 0 && (
                <span className="mb-0.5 inline-flex rounded-full bg-accent px-1.5 py-px text-[9px] font-bold text-accent-foreground">
                  {discount}% OFF
                </span>
              )}
              <p className="line-clamp-1 text-[11px] font-bold leading-tight">{o.title}</p>
              {o.subtitle && <p className="mt-0.5 line-clamp-1 text-[9px] opacity-80">{o.subtitle}</p>}
            </div>
          </>
        );

        const className = cn(
          "relative flex h-[72px] w-[148px] shrink-0 flex-col justify-end overflow-hidden rounded-xl p-2.5 transition-transform active:scale-[0.98] sm:w-[156px]",
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
    </div>
  );
}

export function BrandRail({ title = "Featured brands" }: { title?: string }) {
  const { brands } = useStorefront();
  const list = brands.length
    ? brands.map((b) => ({
        key: b.id,
        id: b.id,
        name: b.name,
        slug: b.slug,
        tagline: b.tagline ?? "Trusted brand",
        image: brandRailVisual(b.logo_url),
      }))
    : BRANDS.map((b) => ({
        key: b.name,
        id: b.name,
        name: b.name,
        slug: b.name.toLowerCase().replace(/\s+/g, "-"),
        tagline: b.tagline,
        image: brandRailVisual(null),
      }));

  if (!list.length) return null;

  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <SeeAll to="/brands" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
        {list.map((b) => (
          <Link
            key={b.key}
            {...brandLinkTarget(b)}
            className="group flex w-[132px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:w-[148px]"
          >
            <div
              className={cn(
                "relative flex aspect-square items-center justify-center overflow-hidden",
                b.image.type === "logo" ? "bg-white" : `bg-gradient-to-br ${brandGradient(b.name)}`,
              )}
            >
              {b.image.type === "logo" ? (
                <img
                  src={b.image.src}
                  alt={b.name}
                  loading="lazy"
                  className="h-[88%] w-[88%] object-contain"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/25 text-lg font-bold text-white shadow-inner backdrop-blur-sm">
                  {brandInitials(b.name)}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center px-2 py-2.5 text-center">
              <span className="line-clamp-1 text-xs font-semibold text-foreground">{b.name}</span>
              <span className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{b.tagline}</span>
            </div>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

export function RecentlyViewedRail({ title = "Recently viewed" }: { title?: string }) {
  const hydrated = useHydrated();
  const items = useRecentlyViewed((s) => s.items);
  const recentScrollRef = useAutoScroll<HTMLDivElement>(items.length > 3);
  if (!hydrated || items.length === 0) return null;
  return (
    <Reveal className="mt-8">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
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
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="h-full w-full bg-secondary" />
  );

  const body =
    layout === "card" ? (
      <div className={cn("flex shrink-0 flex-col overflow-hidden rounded-2xl bg-card", className)}>
        <div className="aspect-[5/3] bg-secondary/80">{imageBlock}</div>
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
        <div className={cn("absolute inset-y-0 left-0 flex flex-col justify-end", layout === "card" ? "" : "w-[78%] p-2.5")}>
          {badge}
          <p className={cn("font-bold leading-tight text-white drop-shadow-sm", layout === "card" ? "" : "line-clamp-1 text-[11px]")}>
            {banner.title}
          </p>
          {banner.subtitle && layout !== "card" && (
            <p className="mt-0.5 line-clamp-1 text-[9px] text-white/85">{banner.subtitle}</p>
          )}
          {banner.subtitle && layout === "card" && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{banner.subtitle}</p>
          )}
        </div>
      </div>
    );
  if (banner.link_slug || banner.product?.slug) {
    const target = resolveBannerLink(banner);
    if (!target) {
      return <div className="shrink-0">{body}</div>;
    }
    return (
      <Link to={target.to} params={target.params} className="shrink-0">
        {body}
      </Link>
    );
  }
  return <div className="shrink-0">{body}</div>;
}

/** Deal / discount banners — horizontal scroll. */
export function OfferBannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useAutoScroll<HTMLDivElement>(banners.length > 2);

  if (banners.length === 0) return null;

  return (
    <div ref={ref} className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {banners.map((b) => (
        <BannerSlide
          key={b.id}
          banner={b}
          layout="card"
          className="w-[min(78vw,280px)] shrink-0 sm:w-[260px]"
          overlayClass=""
          badge={
            <span className="mb-1.5 w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              Offer
            </span>
          }
        />
      ))}
    </div>
  );
}

/** Today's offers block with large promo banners and combo chips. */
export function HomeOffersStrip({
  banners,
  title = "Today's offers",
  subtitle = "Deals & combos",
}: {
  banners: Banner[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="mt-8">
      <div className="flex items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Percent className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <SeeAll to="/offers" />
      </div>
      {banners.length > 0 && (
        <div className="mt-3 px-4">
          <OfferBannerCarousel banners={banners} />
        </div>
      )}
      <div className="mt-4 px-4">
        <OfferCards embedded />
      </div>
    </Reveal>
  );
}

/** Festival / pooja campaign banners — separate from grocery offers. */
export function FestivalBannerCarousel({
  banners,
  title = "Festival picks",
  subtitle = "Pooja kits, lamps and seasonal specials",
}: {
  banners: Banner[];
  title?: string;
  subtitle?: string;
}) {
  const ref = useAutoScroll<HTMLDivElement>(banners.length > 1);
  if (banners.length === 0) return null;
  return (
    <Reveal className="mt-8">
      <div className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-orange-800 px-4 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-50">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400/20 text-amber-200">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              <p className="text-[11px] text-amber-100/75">{subtitle}</p>
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
  title = "Deal of the day",
}: {
  products: Product[];
  curated?: Product[];
  title?: string;
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
        <h2 className="text-base font-bold text-foreground">{title}</h2>
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
  const list = curated != null ? curated : categoryList;
  const ref = useAutoScroll<HTMLDivElement>(list.length > 3);

  if (tabs.length === 0 && list.length === 0) return null;

  return (
    <Reveal className="mt-8">
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
  title,
  subtitle,
}: {
  products: Product[];
  curated?: Product[];
  ceiling?: number;
  title?: string;
  subtitle?: string;
}) {
  const items =
    curated && curated.length > 0
      ? curated.filter((p) => Number(p.price) <= ceiling).slice(0, 12)
      : products.filter((p) => Number(p.price) <= ceiling).slice(0, 12);
  const ref = useAutoScroll<HTMLDivElement>(items.length > 3);
  if (items.length === 0) return null;
  return (
    <Reveal className="mt-8">
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-accent-soft to-accent-soft/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-accent-foreground">
            {title ?? `Under ${formatINR(ceiling)} store`}
          </h2>
          <SeeAll to="/deals" search={{ tab: "budget" }} />
        </div>
        <p className="mt-0.5 text-xs text-accent-foreground/75">
          {subtitle ?? "Small basket, big savings"}
        </p>
        <div ref={ref} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} className="w-[142px] shrink-0" />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/** Horizontal category scroller — shop by category row. */
export function CategoryShopRail({
  categories,
  title = "Shop by category",
}: {
  categories: Array<{ id: string; name: string; slug: string; image_url?: string | null }>;
  title?: string;
}) {
  const scrollRef = useAutoScroll<HTMLDivElement>(categories.length > 3);
  if (categories.length === 0) return null;
  return (
    <Reveal className="mt-7">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <SeeAll to="/categories" />
      </div>
      <div ref={scrollRef} className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="flex w-[76px] shrink-0 flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <div className="h-[76px] w-[76px] overflow-hidden rounded-2xl border border-border bg-accent-soft">
              {c.image_url && (
                <img src={c.image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

/** Shop-by-need tiles — bento mix of one hero tile + smaller tiles. */
export function ShopByNeed({
  categories,
  title = "Shop by need",
}: {
  categories: Array<{ id: string; name: string; slug: string; image_url: string | null }>;
  title?: string;
}) {
  const tiles = categories.slice(0, 6);
  if (tiles.length === 0) return null;
  return (
    <Reveal className="mt-8">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <SeeAll to="/categories" />
      </div>
      <div className="mt-3 grid auto-rows-[88px] grid-cols-4 gap-2 px-4 sm:auto-rows-[96px] sm:gap-3">
        {tiles.map((c, i) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card transition-transform active:scale-[0.97]",
              i === 0 ? "col-span-2 row-span-2" : "col-span-1",
            )}
          >
            <div className="absolute inset-0 bg-secondary">
              {c.image_url && (
                <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            </div>
            <p
              className={cn(
                "absolute bottom-0 left-0 right-0 font-semibold leading-tight text-white drop-shadow",
                i === 0 ? "p-3 text-sm" : "p-2 text-[10px]",
              )}
            >
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
    <Reveal className="mt-4 px-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-card/40 p-2">
        {items.map((i) => (
          <div
            key={i.label}
            className="flex min-w-[88px] shrink-0 flex-col items-center gap-1 rounded-xl bg-card px-2 py-2 text-center"
          >
            <i.icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-[9px] font-semibold leading-tight text-muted-foreground">{i.label}</span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}


function HomeDynamicSection({
  section,
  homeCatalog,
  allProducts,
  categories,
  offerBanners,
  festiveBanners,
}: {
  section: HomeSectionBlock;
  homeCatalog: HomeCatalogData;
  allProducts: Product[];
  categories: Array<{ id: string; name: string; slug: string; image_url?: string | null }>;
  offerBanners: Banner[];
  festiveBanners: Banner[];
}) {
  const products = resolveHomeSectionBlockProducts(section, homeCatalog);
  const href = section.see_all_tab
    ? { to: "/deals" as const, search: { tab: section.see_all_tab } }
    : undefined;

  switch (section.layout) {
    case "categories":
      return <CategoryShopRail categories={categories} title={section.title} />;
    case "offers_strip":
      return <HomeOffersStrip banners={offerBanners} title={section.title} subtitle={section.subtitle} />;
    case "coupon_strip":
      return <CouponStrip title={section.title} />;
    case "festive_banners":
      return (
        <FestivalBannerCarousel
          banners={festiveBanners}
          title={section.title}
          subtitle={section.subtitle}
        />
      );
    case "shop_by_need":
      return <ShopByNeed categories={categories} title={section.title} />;
    case "brands":
      return <BrandRail title={section.title} />;
    case "recently_viewed":
      return <RecentlyViewedRail title={section.title} />;
    case "service_promises":
      return <ServicePromises />;
    case "countdown_rail":
      return (
        <FlashSaleRail
          products={allProducts}
          curated={products}
          title={section.title}
          subtitle={section.subtitle}
        />
      );
    case "budget_rail":
      return (
        <BudgetRail
          products={allProducts}
          curated={products}
          ceiling={section.max_price ?? 99}
          title={section.title}
          subtitle={section.subtitle}
        />
      );
    case "deal_card":
      return (
        <DealOfTheDay products={allProducts} curated={products} title={section.title} />
      );
    default:
      if (section.key === "festive_picks") {
        if (!products.length && section.fallback_rule === "manual") return null;
        return (
          <FestivalPicks
            categories={categories}
            products={allProducts}
            curated={products}
            title={section.title}
          />
        );
      }
      if (!products.length) return null;
      return (
        <ProductRail
          title={section.title}
          products={products}
          href={href}
          size={homeSectionDisplaySize(section)}
        />
      );
  }
}

/** Renders admin-configured home offer sections in sort order. */
export function HomeDynamicSections({
  sections,
  homeCatalog,
  allProducts,
  categories,
  offerBanners = [],
  festiveBanners = [],
}: {
  sections: HomeSectionBlock[];
  homeCatalog: HomeCatalogData;
  allProducts: Product[];
  categories: Array<{ id: string; name: string; slug: string; image_url?: string | null }>;
  offerBanners?: Banner[];
  festiveBanners?: Banner[];
}) {
  const sorted = sortHomeSections(sections);
  if (!sorted.length) return null;
  return (
    <>
      {sorted.map((section) => (
        <HomeDynamicSection
          key={section.id}
          section={section}
          homeCatalog={homeCatalog}
          allProducts={allProducts}
          categories={categories}
          offerBanners={offerBanners}
          festiveBanners={festiveBanners}
        />
      ))}
    </>
  );
}
