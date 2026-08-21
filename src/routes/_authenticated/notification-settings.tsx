import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Package, Tag, TrendingDown, Sparkles, Mail } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { useNotificationPrefs } from "@/lib/client-store";
import { cn } from "@/lib/utils";
import { isPushSupported } from "@/lib/push-notifications";

export const Route = createFileRoute("/_authenticated/notification-settings")({
  head: () => ({
    meta: [
      { title: "Notification Settings — Sri Mahalakshmi Stores" },
      { name: "description", content: "Manage how we notify you about orders, deals and price drops." },
    ],
  }),
  component: NotificationSettingsPage,
});

const PREFS = [
  {
    key: "orderUpdates" as const,
    icon: Package,
    title: "Order updates",
    description: "Confirmation, packing and delivery status",
  },
  {
    key: "deliveryAlerts" as const,
    icon: Bell,
    title: "Delivery alerts",
    description: "Rider on the way and arrival notifications",
  },
  {
    key: "offersDeals" as const,
    icon: Tag,
    title: "Offers & deals",
    description: "Flash sales, coupons and festive promotions",
  },
  {
    key: "priceDrops" as const,
    icon: TrendingDown,
    title: "Price drop alerts",
    description: "When items on your watchlist go on sale",
  },
  {
    key: "newArrivals" as const,
    icon: Sparkles,
    title: "New arrivals",
    description: "Fresh products added to the store",
  },
  {
    key: "newsletter" as const,
    icon: Mail,
    title: "Weekly newsletter",
    description: "Recipes, ritual guides and store news",
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function NotificationSettingsPage() {
  const prefs = useNotificationPrefs();

  return (
    <PageShell>
      <TopBar title="Notification settings" subtitle="Choose what you hear about" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
        <Bell className="h-7 w-7" />
        <p className="mt-2 text-sm font-bold">Stay in the loop</p>
        <p className="mt-1 text-xs text-primary-foreground/80">
          {isPushSupported()
            ? "Push notifications are supported on this device"
            : "Enable notifications in your browser settings for real-time alerts"}
        </p>
        <Link
          to="/notifications"
          className="mt-3 inline-block text-xs font-semibold text-primary-foreground underline"
        >
          View notification inbox →
        </Link>
      </section>

      <div className="mt-5 space-y-2 px-4 pb-8">
        {PREFS.map(({ key, icon: Icon, title, description }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Toggle on={prefs[key]} onChange={(v) => prefs.set({ [key]: v })} />
          </div>
        ))}
      </div>

      <p className="px-4 pb-8 text-center text-[11px] text-muted-foreground">
        Order and delivery notifications cannot be fully disabled while you have active orders.
      </p>
    </PageShell>
  );
}
