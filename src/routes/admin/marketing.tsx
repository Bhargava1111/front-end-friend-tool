import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Megaphone,
  Mail,
  MessageSquare,
  Gift,
  Percent,
  Users,
  TrendingUp,
  Calendar,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Campaigns, promotions and customer outreach." },
    ],
  }),
  component: MarketingPage,
});

const CAMPAIGNS = [
  {
    name: "Weekend Mega Sale",
    type: "Sale",
    status: "active",
    reach: "4,200",
    conversions: "128",
    revenue: "₹1,84,500",
    ends: "Tonight",
  },
  {
    name: "First Order ₹100 Off",
    type: "Coupon",
    status: "active",
    reach: "890",
    conversions: "67",
    revenue: "₹42,300",
    ends: "Ongoing",
  },
  {
    name: "Pooja Festive Bundle",
    type: "Promotion",
    status: "scheduled",
    reach: "—",
    conversions: "—",
    revenue: "—",
    ends: "Sep 1",
  },
  {
    name: "Win-back inactive users",
    type: "Email",
    status: "draft",
    reach: "320",
    conversions: "—",
    revenue: "—",
    ends: "Draft",
  },
];

const QUICK_ACTIONS = [
  { to: "/admin/coupons/new", label: "Create coupon", icon: Percent, tone: "bg-primary-soft text-primary" },
  { to: "/admin/promotions", label: "BOGO / discounts", icon: Gift, tone: "bg-accent-soft text-accent-foreground" },
  { to: "/admin/banners/new", label: "New banner", icon: Megaphone, tone: "bg-secondary text-foreground" },
  { to: "/admin/notifications", label: "Push notify", icon: MessageSquare, tone: "bg-primary-soft text-primary" },
  { to: "/admin/home-sections", label: "Home sections", icon: Zap, tone: "bg-accent-soft text-accent-foreground" },
  { to: "/admin/abandoned-carts", label: "Recover carts", icon: Users, tone: "bg-destructive/10 text-destructive" },
];

function MarketingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">Marketing hub</h1>
        <p className="text-sm text-muted-foreground">Campaigns, promotions and outreach tools</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active campaigns", value: "3", icon: Megaphone },
          { label: "Emails sent (30d)", value: "2,840", icon: Mail },
          { label: "Coupon redemptions", value: "186", icon: Percent },
          { label: "Campaign ROI", value: "4.2×", icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-center text-[11px] font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
          <Button size="sm" className="rounded-xl text-xs">New campaign</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Campaign</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Reach</th>
                <th className="px-4 py-2.5 font-medium text-right">Conversions</th>
                <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-4 py-2.5 font-medium">Ends</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        c.status === "active"
                          ? "bg-primary-soft text-primary"
                          : c.status === "scheduled"
                            ? "bg-accent-soft text-accent-foreground"
                            : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.reach}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.conversions}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.revenue}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {c.ends}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Channel performance</h2>
          <div className="mt-3 space-y-2">
            {[
              { channel: "Push notifications", sent: 1240, ctr: "8.2%" },
              { channel: "SMS campaigns", sent: 680, ctr: "12.4%" },
              { channel: "In-app banners", sent: 4200, ctr: "3.1%" },
              { channel: "Email newsletters", sent: 890, ctr: "18.6%" },
            ].map((ch) => (
              <div key={ch.channel} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                <span className="text-sm text-foreground">{ch.channel}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold">{ch.sent.toLocaleString("en-IN")} sent</p>
                  <p className="text-[10px] text-primary">CTR {ch.ctr}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary-soft/20 p-4">
          <h2 className="text-sm font-semibold text-foreground">Suggested actions</h2>
          <ul className="mt-3 space-y-2">
            {[
              { text: "12 abandoned carts worth ₹18,400 — send recovery SMS", to: "/admin/abandoned-carts" },
              { text: "Flash sale ends tonight — boost push notification", to: "/admin/notifications" },
              { text: "8 products low on stock during active sale", to: "/admin/inventory" },
            ].map(({ text, to }) => (
              <Link
                key={text}
                to={to}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/50"
              >
                {text}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
              </Link>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
