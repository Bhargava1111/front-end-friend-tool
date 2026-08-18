import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { getLoyalty } from "@/lib/platform.functions";

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
  const fetch = useServerFn(getLoyalty);
  const { data } = useQuery({
    queryKey: ["loyalty"],
    queryFn: () => fetch() as Promise<{ points: number; lifetime_points: number; tier: string }>,
  });
  const points = data?.points ?? 0;
  const tier = data?.tier ?? "Bronze";
  const nextTier = tier === "bronze" ? "Silver" : "Gold";
  const pointsToNextTier = Math.max(0, 500 - points);
  const progress = Math.min(100, Math.round((points / 500) * 100));

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

      <section className="px-4 pb-8">
        <p className="text-sm text-muted-foreground">
          Earn 1 point for every ₹10 spent. Points are credited when your order is delivered.
        </p>
      </section>
    </PageShell>
  );
}
