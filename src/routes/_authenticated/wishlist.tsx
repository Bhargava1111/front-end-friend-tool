import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-shop";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Sri Mahalakshmi Stores" },
      { name: "description", content: "Products you saved for later at Sri Mahalakshmi Stores." },
      { property: "og:title", content: "Wishlist — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Your saved groceries and pooja items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { data, isLoading } = useWishlist();
  const items = data ?? [];

  return (
    <PageShell>
      <TopBar title="Wishlist" subtitle={`${items.length} saved`} />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="No favourites yet"
          description="Tap the heart on any product to save it here."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/categories">Browse products</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {items.map((w) => (
            <ProductCard key={w.id} product={w.product} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
