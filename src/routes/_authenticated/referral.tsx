import { createFileRoute } from "@tanstack/react-router";
import { Copy, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { REFERRAL_DEMO } from "@/lib/content";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/referral")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — Sri Mahalakshmi Stores" },
      { name: "description", content: "Share your referral code and earn store credit when friends place their first order." },
      { property: "og:title", content: "Refer & Earn" },
      { property: "og:description", content: "Give ₹150, get ₹150 when a friend orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const { code, friendReward, yourReward, invited, joined, earned } = REFERRAL_DEMO;

  async function share() {
    const text = `Use my code ${code} on Sri Mahalakshmi Stores and get ₹${friendReward} off your first grocery order.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Sri Mahalakshmi Stores", text });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Invite copied to clipboard");
  }

  return (
    <PageShell>
      <TopBar title="Refer & earn" subtitle={`Give ₹${friendReward}, get ₹${yourReward}`} />

      <section className="px-4 pt-4">
        <div className="rounded-3xl border border-dashed border-primary/40 bg-primary-soft p-5 text-center">
          <UserPlus className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Your referral code</p>
          <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-primary">{code}</p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("Code copied");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <Button className="h-11 flex-1 rounded-xl" onClick={share}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 p-4">
        {[
          { value: invited, label: "Invited" },
          { value: joined, label: "Joined" },
          { value: formatINR(earned), label: "Earned" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center card-elevated">
            <p className="text-base font-bold text-foreground">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="px-4 pb-8">
        <h2 className="mb-2 text-sm font-bold">How it works</h2>
        <ol className="space-y-2.5">
          {[
            "Share your code with a friend who hasn't ordered before.",
            `They get ₹${friendReward} off their first order above ₹399.`,
            `Once their order is delivered, ₹${yourReward} lands in your store wallet.`,
          ].map((step, i) => (
            <li key={step} className="flex gap-3 rounded-2xl border border-border bg-card p-4 card-elevated">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
