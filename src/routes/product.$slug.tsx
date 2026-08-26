import { createFileRoute, notFound, useNavigate, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  PackageSearch,
  Share2,
  Bookmark,
  ShoppingCart,
  Star,
  Leaf,
  Check,
  GitCompareArrows,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatShopError } from "@/lib/auth-session";
import { getProductBySlug } from "@/lib/catalog.functions";
import { addToCart, toggleWishlist } from "@/lib/shop.functions";
import { trackProductView } from "@/lib/analytics";
import { useSession, useWishlist } from "@/hooks/use-shop";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { CartCountBadge } from "@/components/cart-count-badge";
import { ProductDetailSkeleton } from "@/components/skeletons";
import { ProductRail } from "@/components/product-rail";
import { ImageGallery } from "@/components/image-gallery";
import { VariantPicker, pickDefaultVariant } from "@/components/variant-picker";
import {
  QtyPriceTable,
  referenceTierUnitPrice,
  resolveVariantPriceTiers,
  unitPriceForQty,
} from "@/components/qty-price-table";
import { formatVariantDisplayLabel } from "@/lib/pack-units";
import { ProductReviews } from "@/components/product-reviews";
import { ProductCard } from "@/components/product-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatINR } from "@/lib/format";
import { useRecentlyViewed, useSaveForLater, useCompareList } from "@/lib/client-store";
import { cn } from "@/lib/utils";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

const PRODUCT_FAQS = [
  {
    q: "How fresh are the products delivered?",
    a: "Every order is packed after you place it. Perishables are picked from stock received within the last 24 hours.",
  },
  {
    q: "What is the return policy?",
    a: "Raise a return from your order page within 24 hours of delivery for damaged, expired or incorrect items. Refunds are processed within 3 working days.",
  },
  {
    q: "Do you deliver on festival days?",
    a: "Yes. Pooja essentials get priority slots during festival weeks, with extended delivery hours until midnight.",
  },
  {
    q: "Can I pay online?",
    a: "Cash on delivery is live today. UPI, cards and net banking appear at checkout as soon as our payment partner is activated.",
  },
];

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data.product?.slug) throw notFound();
    return {
      name: data.product.name,
      description: data.product.description,
      image: data.product.image_url,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Sri Mahalakshmi Stores`;
    const description =
      loaderData.description ?? `Buy ${loaderData.name} online with fast doorstep delivery.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (loaderData.image?.startsWith("https://")) {
      meta.push({ property: "og:image", content: loaderData.image });
      meta.push({ name: "twitter:image", content: loaderData.image });
    }
    return { meta };
  },
  component: ProductPage,
  pendingComponent: () => (
    <PageShell>
      <TopBar title="Loading product…" backTo="/" />
      <ProductDetailSkeleton />
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <PageShell>
      <TopBar title="Product not found" backTo="/" />
      <EmptyState
        icon={<PackageSearch className="h-8 w-8" />}
        title="This product is unavailable"
        description="It may be out of catalogue. Explore other items instead."
      />
    </PageShell>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const product = data.product!;
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const add = addToCart;
  const toggle = toggleWishlist;
  const { data: wishlist } = useWishlist();
  const [qty, setQty] = useState(1);
  const variants = useMemo(
    () => (product.variants ?? []).filter((v) => v.is_active !== false),
    [product.variants],
  );
  const [variantId, setVariantId] = useState<string | null>(
    () => pickDefaultVariant(product.variants)?.id ?? null,
  );
  useEffect(() => {
    setVariantId(pickDefaultVariant(product.variants)?.id ?? null);
    setQty(1);
  }, [product.id, product.variants]);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const price = Number(variant?.price ?? product.price);
  const mrp = variant ? (variant.mrp ? Number(variant.mrp) : null) : product.mrp ? Number(product.mrp) : null;
  const stock = variant ? variant.stock : product.stock;
  const packLabel = variant
    ? formatVariantDisplayLabel({
        label: variant.label,
        unit: variant.unit,
        unit_value: variant.unit_value,
      })
    : product.weight;
  const referencePrice = useMemo(() => {
    const defaultVariant = pickDefaultVariant(product.variants);
    return referenceTierUnitPrice(
      product.price_tiers,
      Number(defaultVariant?.price ?? product.price),
    );
  }, [product.price, product.price_tiers, product.variants]);
  const pricingTiers = useMemo(() => {
    if (variant?.price_tiers?.length) return variant.price_tiers;
    if (variants.length > 0) {
      return resolveVariantPriceTiers(product.price_tiers, price, referencePrice);
    }
    return product.price_tiers;
  }, [
    price,
    product.price_tiers,
    referencePrice,
    variant?.price_tiers,
    variants.length,
  ]);
  const activeUnitPrice = unitPriceForQty(qty, price, pricingTiers);
  const galleryImages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (src?: string | null) => {
      const trimmed = src?.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      out.push(trimmed);
    };
    push(variant?.image_url);
    for (const src of product.images ?? []) push(src);
    push(product.image_url);
    return out;
  }, [product.image_url, product.images, variant?.image_url]);
  const trackViewed = useRecentlyViewed((s) => s.add);
  const saveLater = useSaveForLater();
  const compareList = useCompareList();

  useEffect(() => {
    trackViewed(product);
    void trackProductView({
      productId: product.id,
      source: typeof document !== "undefined" && /search/i.test(document.referrer) ? "search" : "direct",
      referrer: typeof window !== "undefined" ? window.location.pathname : "",
    });
  }, [product.id, trackViewed]);

  const wishlisted = (wishlist ?? []).some((w) => w.product?.id === product.id);
  const saved = saveLater.items.some((p) => p.id === product.id);
  const inCompare = compareList.has(product.id);
  const discount = mrp && mrp > activeUnitPrice ? Math.round(((mrp - activeUnitPrice) / mrp) * 100) : 0;

  const bundle = (data.related ?? []).slice(0, 2);
  const bundleTotal = price + bundle.reduce((s, p) => s + Number(p.price), 0);
  const productThumb = (p: { image_url?: string | null; images?: string[] }) =>
    p.images?.[0] || p.image_url || "";

  const requireAuth = () => {
    if (session) return false;
    toast.info("Please sign in to continue");
    navigate({ to: "/auth" });
    return true;
  };

  const addMutation = useMutation({
    mutationFn: (payload: { productId: string; quantity: number; variantId: string | null }) =>
      add({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  const bundleMutation = useMutation({
    mutationFn: async () => {
      for (const p of [product, ...bundle]) {
        await add({ data: { productId: p.id, quantity: 1 } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Bundle added to cart");
    },
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  const wishMutation = useMutation({
    mutationFn: () => toggle({ data: { productId: product.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* dismissed */
    }
  }

  return (
    <PageShell className="pb-40">
      <TopBar
        title={product.name}
        backTo="/"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Compare product"
              onClick={() => {
                if (inCompare) {
                  compareList.remove(product.id);
                  toast.success("Removed from compare");
                } else {
                  const ok = compareList.add(product);
                  if (ok) toast.success("Added to compare");
                  else toast.error("Compare list full (max 4 items)");
                }
              }}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full bg-secondary",
                inCompare && "text-primary",
              )}
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Share product"
              onClick={share}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <ShoppingCart className="h-4 w-4" />
              <CartCountBadge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 bg-primary text-primary-foreground" />
            </Link>
            <button
              type="button"
              aria-label="Toggle wishlist"
              onClick={() => {
                if (requireAuth()) return;
                wishMutation.mutate();
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <Heart className={cn("h-4 w-4", wishlisted && "fill-destructive text-destructive")} />
            </button>
          </div>
        }
      />

      <ImageGallery
        key={variantId ?? product.id}
        images={galleryImages}
        alt={product.name}
        badge={
          discount > 0 ? (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              {discount}% OFF
            </span>
          ) : null
        }
      />

      {product.video_url && (
        <div className="px-4 pt-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Product video</h2>
          <div className="overflow-hidden rounded-2xl bg-black card-elevated">
            {/\.(mp4|webm|ogg)$/i.test(product.video_url) ? (
              <video
                src={product.video_url}
                controls
                playsInline
                preload="metadata"
                poster={product.image_url ?? undefined}
                className="aspect-video w-full"
              />
            ) : (
              <iframe
                src={product.video_url}
                title={`${product.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="aspect-video w-full"
              />
            )}
          </div>
        </div>
      )}

      <div className="px-4 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              stock > 0 ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive",
            )}
          >
            {stock > 0 ? "In stock" : "Out of stock"}
          </span>
          {discount > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
              {discount}% OFF
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">{product.name}</h1>
        {packLabel && <p className="mt-1 text-sm text-muted-foreground">{packLabel}</p>}

        {Number(product.rating ?? 0) > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-semibold text-foreground">{Number(product.rating).toFixed(1)}</span>
            <span>· {product.rating_count ?? 0} reviews</span>
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-3xl font-bold text-primary">{formatINR(activeUnitPrice)}</span>
            {discount > 0 && mrp && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                {formatINR(mrp)}
              </span>
            )}
            {qty > 1 && (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Total {formatINR(activeUnitPrice * qty)} for {qty} pcs
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1.5 card-elevated">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-8 w-8 place-items-center rounded-full text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-5 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(stock || 99, q + 1))}
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {stock > 0 && stock <= 10 && (
          <p className="mt-2 text-xs font-semibold text-destructive">Only {stock} left</p>
        )}

        <VariantPicker
          variants={variants}
          selectedId={variantId}
          onSelect={(v) => {
            setVariantId(v.id);
            setQty(1);
          }}
          priceTiers={pricingTiers}
          unitPrice={price}
          mrp={mrp}
          maxQty={stock > 0 ? stock : 999}
          selectedQty={qty}
          onSelectQty={(next) => setQty(Math.min(stock || 99, Math.max(1, next)))}
        />

        {variants.length === 0 && (
          <QtyPriceTable
            unitPrice={price}
            mrp={mrp}
            maxQty={stock > 0 ? stock : 999}
            selectedQty={qty}
            onSelectQty={(next) => setQty(Math.min(stock || 99, Math.max(1, next)))}
            adminTiers={product.price_tiers}
          />
        )}

        {product.description && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        )}

        {product.is_combo && (product.combo_items ?? []).length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground">This combo includes</h2>
            <ul className="mt-2 space-y-2">
              {(product.combo_items ?? []).map((item) => (
                <li
                  key={item.product_id}
                  className="flex items-center gap-3 rounded-2xl bg-secondary p-3"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name ?? "Product"}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card">
                      <PackageSearch className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name ?? "Product"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.quantity}
                      {item.price != null ? ` · ${formatINR(item.price)} each` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary p-3 text-center">
            <Truck className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Same-day delivery</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary p-3 text-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Quality assured</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary p-3 text-center">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Naturally sourced</span>
          </div>
        </div>

        {(product.benefits ?? []).length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-foreground">Benefits</h2>
            <ul className="mt-2 space-y-2">
              {(product.benefits ?? []).map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-base font-bold text-foreground">Specifications</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["Category", data.categoryName],
              ["Weight", packLabel],
              ["Shelf life", product.shelf_life],
              ["Origin", product.origin],
              ["SKU", variant?.sku ?? null],
            ]
              .filter(([, value]) => !!value)
              .map(([label, value]) => (
                <div key={label as string} className="rounded-2xl bg-secondary p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              saveLater.toggle(product);
              toast.success(saved ? "Removed from saved items" : "Saved for later");
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (inCompare) {
                compareList.remove(product.id);
                toast.success("Removed from compare");
              } else {
                const ok = compareList.add(product);
                if (ok) toast.success("Added to compare");
                else toast.error("Compare list full (max 4)");
              }
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium",
              inCompare && "border-primary text-primary",
            )}
          >
            <GitCompareArrows className="h-4 w-4" />
            {inCompare ? "Comparing" : "Compare"}
          </button>
        </div>
      </div>

      {bundle.length > 0 && (
        <section className="mt-7 px-4">
          <h2 className="text-base font-bold text-foreground">Frequently bought together</h2>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3 card-elevated">
            <div className="flex gap-3">
              {[product, ...bundle].map((p) => (
                <div key={p.id} className="min-w-0 flex-1">
                  <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
                    {productThumb(p) && (
                      <img src={productThumb(p)} alt={p.name} loading="lazy" className="h-full w-full object-contain p-1" />
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatINR(p.price)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Bundle total</p>
                <p className="text-base font-bold text-primary">{formatINR(bundleTotal)}</p>
              </div>
              <button
                type="button"
                disabled={bundleMutation.isPending}
                onClick={() => {
                  if (requireAuth()) return;
                  bundleMutation.mutate();
                }}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Add all {bundle.length + 1}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mt-7 px-4">
        <ProductReviews productId={product.id} />
      </section>

      <section className="mt-7 px-4">
        <h2 className="text-base font-bold text-foreground">Product FAQ</h2>
        <Accordion type="single" collapsible className="mt-2">
          {PRODUCT_FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <ProductRail title="You may also like" products={data.related} />

      {data.related.length > 4 && (
        <section className="mt-7 px-4">
          <h2 className="text-base font-bold text-foreground">Similar picks</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {data.related.slice(4, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            to="/cart"
            className="flex-1 rounded-full border border-border bg-card py-3 text-center text-sm font-semibold text-foreground"
          >
            Go to Cart
          </Link>
          <button
            type="button"
            disabled={stock === 0 || addMutation.isPending}
            onClick={() => {
              if (requireAuth()) return;
              addMutation.mutate({ productId: product.id, quantity: qty, variantId });
            }}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
          >
            {stock === 0
              ? "Out of stock"
              : qty > 1
                ? `Add to Cart · ${formatINR(activeUnitPrice * qty)}`
                : "Add to Cart"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
