import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, MapPin, Search, ShoppingCart, User } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { useCartCount } from "@/hooks/use-shop";
import { cn } from "@/lib/utils";
import { isNativePlatform } from "@/lib/capacitor";

const navLinks = [
  { to: "/", label: "Home", exact: true },
  { to: "/categories", label: "Categories" },
  { to: "/deals", label: "Deals" },
  { to: "/offers", label: "Offers" },
  { to: "/brands", label: "Brands" },
  { to: "/coupons", label: "Coupons" },
  { to: "/stores", label: "Stores" },
] as const;

/** Wide-screen top navigation. Hidden on mobile, where the bottom tab bar is used. */
export function DesktopHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCartCount();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 hidden border-b border-border bg-background/90 backdrop-blur-md",
        !isNativePlatform() && "lg:block",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            SM
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-foreground">
              Sri Mahalakshmi Stores
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Groceries &amp; pooja essentials
            </span>
          </span>
        </Link>

        <Link
          to="/search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search for rice, ghee, agarbatti…</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/stores"
            aria-label="Store locator"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground"
          >
            <MapPin className="h-4 w-4" />
          </Link>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground"
          >
            <Heart className="h-4 w-4" />
          </Link>
          <NotificationBell className="border border-border" />
          <ThemeToggle />
          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Account"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl items-center gap-1 px-6 pb-2">
        {navLinks.map(({ to, label, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
