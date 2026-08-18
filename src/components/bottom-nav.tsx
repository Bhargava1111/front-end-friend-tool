import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-shop";
import { useI18n } from "@/hooks/use-i18n";

const tabs = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/categories", labelKey: "nav.categories", icon: LayoutGrid },
  { to: "/cart", labelKey: "nav.cart", icon: ShoppingCart },
  { to: "/orders", labelKey: "nav.orders", icon: ClipboardList },
  { to: "/profile", labelKey: "nav.profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCartCount();
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, labelKey, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                {to === "/cart" && count > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {count}
                  </span>
                )}
              </span>
              {t(labelKey)}
              {active && (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
