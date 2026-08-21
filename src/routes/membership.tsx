import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown,
  Check,
  Gift,
  Truck,
  Percent,
  Star,
  Zap,
  ChevronRight,
} from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Bronze",
    spend: "₹0+",
    points: "1 pt / ₹10",
    perks: ["Earn points on every order", "Birthday coupon ₹50", "Early sale access"],
    tone: "border-border bg-card",
    badge: "bg-secondary text-foreground",
  },
  {
    name: "Silver",
    spend: "₹5,000+",
    points: "1.5 pt / ₹10",
    perks: ["Free delivery on ₹299+", "Priority support", "Exclusive monthly deals", "5% extra on festive combos"],
    tone: "border-primary/40 bg-primary-soft/30",
    badge: "bg-primary text-primary-foreground",
    popular: true,
  },
  {
    name: "Gold",
    spend: "₹15,000+",
    points: "2 pt / ₹10",
    perks: ["Free delivery always", "Dedicated support line", "First access to new arrivals", "10% extra on bulk orders", "Annual gift hamper"],
    tone: "border-accent/50 bg-accent-soft/40",
    badge: "bg-accent text-accent-foreground",
  },
];

const BENEFITS = [
  { icon: Percent, title: "Earn on every order", copy: "Points credited when your order is delivered" },
  { icon: Gift, title: "Redeem for vouchers", copy: "Convert points to ₹ off your next purchase" },
  { icon: Truck, title: "Free delivery perks", copy: "Silver & Gold members get reduced delivery thresholds" },
  { icon: Zap, title: "Early sale access", copy: "Shop flash sales 2 hours before everyone else" },
  { icon: Star, title: "Birthday rewards", copy: "Special coupon on your birthday month" },
  { icon: Crown, title: "Tier upgrades", copy: "Spend more to unlock better benefits automatically" },
];

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership Program — Earn & Save | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Join our loyalty program. Earn points on every order, unlock free delivery and exclusive deals.",
      },
      { property: "og:title", content: "Membership — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Bronze, Silver and Gold tiers with real rewards." },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  return (
    <PageShell>
      <TopBar title="Membership" subtitle="Earn more, save more" backTo="/" />

      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-accent/90 to-primary p-6 text-accent-foreground lg:mx-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-background/10 blur-3xl"
        />
        <div className="relative text-center">
          <Crown className="mx-auto h-10 w-10" />
          <h1 className="mt-3 text-2xl font-bold">Mahalakshmi Rewards</h1>
          <p className="mt-2 text-sm text-accent-foreground/85">
            Free to join. Start earning from your very first order.
          </p>
          <Link to="/auth">
            <Button className="mt-5 rounded-xl bg-accent-foreground px-8 text-accent hover:bg-accent-foreground/90">
              Join free
            </Button>
          </Link>
        </div>
      </section>

      <Reveal className="mt-7 px-4 lg:px-0">
        <h2 className="text-base font-bold text-foreground">Choose your tier</h2>
        <div className="mt-3 space-y-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn("relative overflow-hidden rounded-2xl border p-5", tier.tone)}
            >
              {tier.popular && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-sm font-bold", tier.badge)}>
                  {tier.name[0]}
                </span>
                <div>
                  <p className="text-base font-bold text-foreground">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tier.spend} lifetime spend · {tier.points}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-7 px-4 lg:px-0">
        <h2 className="text-base font-bold text-foreground">Member benefits</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mx-4 mt-8 mb-6 rounded-3xl bg-primary p-5 text-primary-foreground lg:mx-0">
        <p className="text-sm font-bold">Already a member?</p>
        <p className="mt-1 text-xs text-primary-foreground/80">
          Check your points balance and redeem vouchers
        </p>
        <Link
          to="/rewards"
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary-foreground px-4 py-2 text-xs font-semibold text-primary"
        >
          View my rewards <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Reveal>
    </PageShell>
  );
}
