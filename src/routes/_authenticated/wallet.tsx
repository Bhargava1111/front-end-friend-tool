import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { WALLET_DEMO } from "@/lib/content";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Store Wallet — Sri Mahalakshmi Stores" },
      { name: "description", content: "Your store wallet balance, cashback, refunds and transaction history." },
      { property: "og:title", content: "Store Wallet" },
      { property: "og:description", content: "Track cashback, refunds and wallet spending." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  return (
    <PageShell>
      <TopBar title="Store wallet" subtitle="Cashback & refunds" />

      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
            <Wallet className="h-4 w-4" /> Available balance
          </div>
          <p className="mt-2 text-3xl font-bold">{formatINR(WALLET_DEMO.balance)}</p>
          <p className="mt-1 text-xs text-primary-foreground/75">
            Applied automatically at checkout once wallet payments go live.
          </p>
          <Button
            variant="secondary"
            className="mt-4 h-10 rounded-xl"
            onClick={() => toast.info("Wallet top-up opens when online payments go live.")}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add money
          </Button>
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-2 text-sm font-bold">Recent activity</h2>
        <div className="space-y-2.5">
          {WALLET_DEMO.transactions.map((t) => {
            const credit = t.amount > 0;
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
              >
                <span
                  className={
                    credit
                      ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                      : "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
                  }
                >
                  {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <span className={credit ? "text-sm font-bold text-primary" : "text-sm font-bold text-destructive"}>
                  {credit ? "+" : "−"}
                  {formatINR(Math.abs(t.amount))}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Wallet is a preview feature — balances shown are illustrative until online payments are enabled.
        </p>
      </section>
    </PageShell>
  );
}
