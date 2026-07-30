import { createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { REWARDS_DEMO } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "Reward Points — Sri Mahalakshmi Stores" },
      { name: "description", content: "Track reward points, your membership tier and vouchers you can redeem." },
      { property: "og:title", content: "Reward Points" },
      { property: "og:description", content: "Earn points on every order and redeem them for vouchers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { points, tier, nextTier, pointsToNextTier, history, rewards } = REWARDS_DEMO;
  const progress = Math.round((points / (points + pointsToNextTier)) * 100);

  return (
    <PageShell>
      <TopBar title="Reward points" subtitle={`${tier} member`} />

      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-accent to-accent/80 p-5 text-accent-foreground">
          <div className="flex items-center gap-2 text-xs">
            <Trophy className="h-4 w-4" /> {tier} tier
          </div>
          <p className="mt-2 text-3xl font-bold">{points.toLocaleString("en-IN")} pts</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent-foreground/20">
            <div className="h-full rounded-full bg-accent-foreground/70" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs">
            {pointsToNextTier} points to {nextTier}
          </p>
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <Gift className="h-4 w-4 text-primary" /> Redeem
        </h2>
        <div className="space-y-2.5">
          {rewards.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-[11px] text-muted-foreground">{r.cost} points</p>
              </div>
              <Button
                size="sm"
                className="rounded-xl"
                disabled={points < r.cost}
                onClick={() => toast.success(`${r.label} reserved — it will appear at checkout.`)}
              >
                Redeem
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> Points history
        </h2>
        <div className="rounded-2xl border border-border bg-card p-2 card-elevated">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-2 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm">{h.label}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(h.date)}</p>
              </div>
              <span className={h.points > 0 ? "text-sm font-bold text-primary" : "text-sm font-bold text-destructive"}>
                {h.points > 0 ? "+" : ""}
                {h.points}
              </span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
