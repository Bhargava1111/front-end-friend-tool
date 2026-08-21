import { Link } from "@tanstack/react-router";
import {
  Zap,
  Sparkles,
  Gift,
  Crown,
  PackageSearch,
  Percent,
  Truck,
  Star,
  Flame,
  Package,
  GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/sale", label: "Mega Sale", icon: Zap, tone: "bg-destructive/10 text-destructive" },
  { to: "/festival-store", label: "Festival", icon: Flame, tone: "bg-accent/20 text-accent-foreground" },
  { to: "/new-arrivals", label: "New In", icon: Sparkles, tone: "bg-accent-soft text-accent-foreground" },
  { to: "/deals", label: "Deals", icon: Percent, tone: "bg-primary-soft text-primary" },
  { to: "/bulk-order", label: "Bulk", icon: Package, tone: "bg-secondary text-foreground" },
  { to: "/gift-cards", label: "Gift Cards", icon: Gift, tone: "bg-secondary text-foreground" },
  { to: "/membership", label: "Membership", icon: Crown, tone: "bg-accent/20 text-accent-foreground" },
  { to: "/compare", label: "Compare", icon: GitCompareArrows, tone: "bg-primary-soft text-primary" },
  { to: "/track-order", label: "Track", icon: PackageSearch, tone: "bg-primary-soft text-primary" },
  { to: "/offers", label: "Offers", icon: Star, tone: "bg-accent-soft text-accent-foreground" },
  { to: "/stores", label: "Stores", icon: Truck, tone: "bg-secondary text-foreground" },
] as const;

export function QuickLinks({ className }: { className?: string }) {
  return (
    <div className={cn("px-4", className)}>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {LINKS.map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex w-[72px] shrink-0 flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", tone)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-foreground">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
