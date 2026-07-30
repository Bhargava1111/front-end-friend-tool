import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Minus, Plus, ShieldCheck, Truck, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getProductBySlug } from "@/lib/catalog.functions";
import { addToCart, toggleWishlist } from "@/lib/shop.functions";
import { useSession, useWishlist } from "@/hooks/use-shop";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductRail } from "@/components/product-rail";
import { formatINR } from "@/lib/format";
import { useRecentlyViewed } from "@/lib/client-store";
import { cn } from "@/lib/utils";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

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

  useEffect(() => {
    trackViewed(product);
  }, [product, trackViewed]);

  const wishlisted = (wishlist ?? []).some((w) => w.product?.id === product.id);
  const discount =
    product.mrp && Number(product.mrp) > Number(product.price)
      ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)
      : 0;

  const requireAuth = () => {
    if (session) return false;
    toast.info("Please sign in to continue");
    navigate({ to: "/auth" });
    return true;
  };

  const addMutation = useMutation({
    mutationFn: () => add({ data: { productId: product.id, quantity: qty } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const wishMutation = useMutation({
    mutationFn: () => toggle({ data: { productId: product.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell className="pb-40">
      <TopBar
        title={product.name}
        backTo="/"
        action={
          <button
            type="button"
            aria-label="Toggle wishlist"
            onClick={() => {
              if (requireAuth()) return;
              wishMutation.mutate();
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
          >
            <Heart
              className={cn("h-4.5 w-4.5", wishlisted && "fill-destructive text-destructive")}
            />
          </button>
        }
      />

      <div className="relative aspect-square w-full bg-secondary">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        )}
        {discount > 0 && (
          <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            {discount}% OFF
          </span>
        )}
      </div>

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

        {product.description && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3">
            <Truck className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Same-day delivery</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Quality assured</span>
          </div>
        </div>
      </div>

      <ProductRail title="You may also like" products={data.related} />

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
              addMutation.mutate();
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
