import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { getWallet } from "@/lib/platform.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [{ title: "Store Wallet — Sri Mahalakshmi Stores" }],
  }),
  component: WalletPage,
});

function WalletPage() {
  const fetch = useServerFn(getWallet);
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () =>
      fetch() as Promise<{
        balance: number;
        transactions: Array<{ id: string; type: string; amount: number; description: string; created_at: string }>;
      }>,
  });

  return (
    <PageShell>
      <TopBar title="Store wallet" subtitle="Cashback & refunds" />
      <section className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
            <Wallet className="h-4 w-4" /> Available balance
          </div>
          <p className="mt-2 text-3xl font-bold">
            {isLoading ? "…" : formatINR(data?.balance ?? 0)}
          </p>
        </div>
      </section>
      <section className="p-4">
        <h2 className="mb-2 text-sm font-bold">Recent activity</h2>
        <div className="space-y-2.5">
          {(data?.transactions ?? []).map((t) => {
            const credit = t.type === "credit";
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated">
                <span className={credit ? "grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary" : "grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive"}>
                  {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(t.created_at)}</p>
                </div>
                <span className={credit ? "text-sm font-bold text-primary" : "text-sm font-bold text-destructive"}>
                  {credit ? "+" : "−"}
                  {formatINR(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
