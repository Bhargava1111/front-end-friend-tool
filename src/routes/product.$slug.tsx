import { createFileRoute, notFound, useNavigate, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  PackageSearch,
  RotateCcw,
  Share2,
  Bookmark,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getProductBySlug } from "@/lib/catalog.functions";
import { addToCart, toggleWishlist } from "@/lib/shop.functions";
import { useSession, useWishlist } from "@/hooks/use-shop";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductRail } from "@/components/product-rail";
import { ImageGallery } from "@/components/image-gallery";
import { ProductReviews } from "@/components/product-reviews";
import { ProductCard } from "@/components/product-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatINR } from "@/lib/format";
import { useRecentlyViewed, useSaveForLater } from "@/lib/client-store";
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
    if (!data.product) throw notFound();
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
  const add = useServerFn(addToCart);
  const toggle = useServerFn(toggleWishlist);
  const { data: wishlist } = useWishlist();
  const [qty, setQty] = useState(1);
  const trackViewed = useRecentlyViewed((s) => s.add);
  const saveLater = useSaveForLater();

  useEffect(() => {
    trackViewed(product);
  }, [product, trackViewed]);

  const wishlisted = (wishlist ?? []).some((w) => w.product?.id === product.id);
  const saved = saveLater.items.some((p) => p.id === product.id);
  const discount =
    product.mrp && Number(product.mrp) > Number(product.price)
      ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)
      : 0;

  const variants = useMemo(() => {
    const base = data.related.filter((p) => p.weight && p.weight !== product.weight).slice(0, 3);
    return [product, ...base];
  }, [data.related, product]);

  const bundle = data.related.slice(0, 2);
  const bundleTotal =
    Number(product.price) + bundle.reduce((s, p) => s + Number(p.price), 0);

  const requireAuth = () => {
    if (session) return false;
    toast.info("Please sign in to continue");
    navigate({ to: "/auth" });
    return true;
  };

  const addMutation = useMutation({
    mutationFn: (payload: { productId: string; quantity: number }) => add({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(e.message),
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
    onError: (e: Error) => toast.error(e.message),
  });

  const wishMutation = useMutation({
    mutationFn: () => toggle({ data: { productId: product.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(e.message),
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
              aria-label="Share product"
              onClick={share}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <Share2 className="h-4 w-4" />
            </button>
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
        images={data.images ?? (product.image_url ? [product.image_url] : [])}
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
        <h1 className="text-lg font-bold leading-snug text-foreground">{product.name}</h1>
        {product.weight && <p className="mt-1 text-sm text-muted-foreground">{product.weight}</p>}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{formatINR(product.price)}</span>
          {discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">
              {formatINR(product.mrp!)}
            </span>
          )}
        </div>

        <p
          className={cn(
            "mt-2 text-xs font-semibold",
            product.stock > 0 ? "text-primary" : "text-destructive",
          )}
        >
          {product.stock > 0 ? `In stock · ${product.stock} available` : "Out of stock"}
        </p>

        {variants.length > 1 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground">Pack size</h2>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
              {variants.map((v) => (
                <Link
                  key={v.id}
                  to="/product/$slug"
                  params={{ slug: v.slug }}
                  className={cn(
                    "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                    v.id === product.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <span className="block">{v.weight ?? "Standard"}</span>
                  <span className="block text-[11px]">{formatINR(v.price)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
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
            <RotateCcw className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">24h easy return</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            saveLater.toggle(product);
            toast.success(saved ? "Removed from saved items" : "Saved for later");
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium"
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
          {saved ? "Saved for later" : "Save for later"}
        </button>
      </div>

      {bundle.length > 0 && (
        <section className="mt-7 px-4">
          <h2 className="text-base font-bold text-foreground">Frequently bought together</h2>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3 card-elevated">
            <div className="flex gap-3">
              {[product, ...bundle].map((p) => (
                <div key={p.id} className="min-w-0 flex-1">
                  <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
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
          <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="text-muted-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-4 text-center text-sm font-semibold">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
              className="text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={product.stock === 0 || addMutation.isPending}
            onClick={() => {
              if (requireAuth()) return;
              addMutation.mutate({ productId: product.id, quantity: qty });
            }}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
          >
            {product.stock === 0 ? "Out of stock" : "Add to cart"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
