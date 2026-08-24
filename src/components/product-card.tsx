import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Plus, Check, Play, Images } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addToCart, toggleWishlist } from "@/lib/shop.functions";
import { trackJourney } from "@/lib/analytics";
import { formatShopError } from "@/lib/auth-session";
import { useSession, useWishlist } from "@/hooks/use-shop";
import { formatINR } from "@/lib/format";
import { pickDefaultVariant } from "@/components/variant-picker";
import { productQtyOptions, unitPriceForQty } from "@/lib/product-qty";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  className,
  fromSearch,
}: {
  product: Product;
  className?: string;
  fromSearch?: boolean;
}) {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const add = addToCart;
  const toggle = toggleWishlist;
  const { data: wishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const qtyOptions = productQtyOptions(product);
  const [selectedQty, setSelectedQty] = useState(() => qtyOptions[0] ?? 1);

  const images = (product.images?.length ? product.images : product.image_url ? [product.image_url] : []).slice(0, 5);
  const [frame, setFrame] = useState(0);
  const [cycling, setCycling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!cycling || images.length < 2) return;
    timer.current = setInterval(() => setFrame((f) => (f + 1) % images.length), 1100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cycling, images.length]);

  useEffect(() => {
    setSelectedQty(qtyOptions[0] ?? 1);
  }, [product.id, qtyOptions.join(",")]);

  const wishlisted = (wishlist ?? []).some((w) => w.product?.id === product.id);
  const defaultVariant = pickDefaultVariant(product.variants);
  const packCount = (product.variants ?? []).filter((v) => v.is_active !== false).length;
  const variantPrice = defaultVariant ? Number(defaultVariant.price) : Number(product.price);
  const price = unitPriceForQty(product, selectedQty, variantPrice);
  const mrp = defaultVariant
    ? defaultVariant.mrp
      ? Number(defaultVariant.mrp)
      : null
    : product.mrp
      ? Number(product.mrp)
      : null;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const addMutation = useMutation({
    mutationFn: (quantity: number) =>
      add({
        data: {
          productId: product.id,
          variantId: defaultVariant?.id ?? null,
          quantity,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
      toast.success(`${product.name} added to cart`);
    },
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  const wishMutation = useMutation({
    mutationFn: () => toggle({ data: { productId: product.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(formatShopError(e)),
  });

  const markSearchClick = () => {
    if (!fromSearch) return;
    void trackJourney({ eventType: "click", productId: product.id });
  };

  const requireAuth = () => {
    if (session) return false;
    toast.info("Please sign in to continue");
    navigate({ to: "/auth" });
    return true;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card card-elevated",
        className,
      )}
    >
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        onClick={markSearchClick}
        onMouseEnter={() => setCycling(true)}
        onMouseLeave={() => {
          setCycling(false);
          setFrame(0);
        }}
        className="relative block aspect-square overflow-hidden bg-secondary/60 p-2"
      >
        {images.length ? (
          <img
            src={images[Math.min(frame, images.length - 1)]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            {discount}% OFF
          </span>
        )}
        {product.video_url && (
          <span
            aria-label="Includes product video"
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background"
          >
            <Play className="h-2.5 w-2.5 fill-current" /> Video
          </span>
        )}
        {images.length > 1 && (
          <>
            <span
              aria-label={`${images.length} images`}
              className="absolute right-2 top-9 flex items-center gap-1 rounded-full bg-foreground/65 px-1.5 py-0.5 text-[10px] font-semibold text-background"
            >
              <Images className="h-2.5 w-2.5" /> {images.length}
            </span>
            <span className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
              {images.map((src, i) => (
                <span
                  key={src + i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === Math.min(frame, images.length - 1)
                      ? "w-3 bg-primary"
                      : "w-1 bg-background/80",
                  )}
                />
              ))}
            </span>
          </>
        )}
        {product.stock === 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-xs font-semibold text-background">
            Out of stock
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => {
          if (requireAuth()) return;
          wishMutation.mutate();
        }}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-destructive"
      >
        <Heart className={cn("h-4 w-4", wishlisted && "fill-destructive text-destructive")} />
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/product/$slug" params={{ slug: product.slug }} onClick={markSearchClick}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          {(defaultVariant?.label ?? product.weight) && (
            <p className="text-xs text-muted-foreground">
              {defaultVariant?.label ?? product.weight}
            </p>
          )}
          {packCount > 1 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
              {packCount} sizes
            </span>
          )}
        </div>

        {qtyOptions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {qtyOptions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQty(q)}
                className={cn(
                  "min-w-[2rem] rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-colors",
                  selectedQty === q
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-bold text-foreground">{formatINR(price)}</p>
            {qtyOptions.length > 0 && (
              <p className="text-[10px] text-muted-foreground">Qty {selectedQty}</p>
            )}
            {discount > 0 && mrp && (
              <p className="text-xs text-muted-foreground line-through">{formatINR(mrp)}</p>
            )}
          </div>

          <button
            type="button"
            disabled={product.stock === 0 || addMutation.isPending}
            onClick={() => {
              if (requireAuth()) return;
              addMutation.mutate(selectedQty);
            }}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
