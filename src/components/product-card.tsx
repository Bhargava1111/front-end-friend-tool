import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Plus, Check, Play, Images } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { addToCart, toggleWishlist } from "@/lib/shop.functions";
import { useSession, useWishlist } from "@/hooks/use-shop";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const add = useServerFn(addToCart);
  const toggle = useServerFn(toggleWishlist);
  const { data: wishlist } = useWishlist();
  const [added, setAdded] = useState(false);

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

  const wishlisted = (wishlist ?? []).some((w) => w.product?.id === product.id);
  const discount =
    product.mrp && Number(product.mrp) > Number(product.price)
      ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)
      : 0;


  const addMutation = useMutation({
    mutationFn: () => add({ data: { productId: product.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
      toast.success(`${product.name} added to cart`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const wishMutation = useMutation({
    mutationFn: () => toggle({ data: { productId: product.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

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
        onMouseEnter={() => setCycling(true)}
        onMouseLeave={() => {
          setCycling(false);
          setFrame(0);
        }}
        className="relative block aspect-square overflow-hidden bg-secondary"
      >
        {images.length ? (
          <img
            src={images[Math.min(frame, images.length - 1)]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
        </Link>
        {product.weight && (
          <p className="text-xs text-muted-foreground">{product.weight}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-base font-bold text-foreground">{formatINR(product.price)}</p>
            {discount > 0 && (
              <p className="text-xs text-muted-foreground line-through">
                {formatINR(product.mrp!)}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={product.stock === 0 || addMutation.isPending}
            onClick={() => {
              if (requireAuth()) return;
              addMutation.mutate();
            }}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
