import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, TrendingDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getHomeData } from "@/lib/catalog.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPriceWatchClient,
  getPriceWatchesClient,
  removePriceWatchClient,
} from "@/lib/platform.functions";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";

type PriceWatch = {
  id: string;
  product_id: string;
  product_name?: string;
  product_slug?: string;
  current_price?: number;
  target_price?: number;
  image_url?: string;
};

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/_authenticated/price-alerts")({
  head: () => ({
    meta: [
      { title: "Price Alerts — Sri Mahalakshmi Stores" },
      { name: "description", content: "Get notified when product prices drop." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: PriceAlertsPage,
});

function PriceAlertsPage() {
  const { data: home } = useSuspenseQuery(homeQuery);
  const queryClient = useQueryClient();
  const [targetPrice, setTargetPrice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: watches = [], isLoading } = useQuery({
    queryKey: ["price-watches"],
    queryFn: () => getPriceWatchesClient() as Promise<PriceWatch[]>,
    retry: false,
  });

  const products = (home.all ?? home.bestSelling ?? []).slice(0, 12);

  const addMutation = useMutation({
    mutationFn: (data: { product_id: string; target_price?: number }) => addPriceWatchClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-watches"] });
      toast.success("Price alert set!");
      setSelectedId(null);
      setTargetPrice("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removePriceWatchClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-watches"] });
      toast.success("Alert removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell>
      <TopBar title="Price alerts" subtitle="We'll notify you when prices drop" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
        <BellRing className="h-7 w-7" />
        <p className="mt-2 text-sm font-bold">Never miss a deal</p>
        <p className="mt-1 text-xs text-primary-foreground/80">
          Set a target price and we'll alert you when it drops
        </p>
      </section>

      {!isLoading && watches.length > 0 && (
        <section className="mt-5 px-4">
          <h2 className="text-sm font-semibold text-foreground">Active alerts ({watches.length})</h2>
          <div className="mt-2 space-y-2">
            {watches.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                  {w.image_url && <img src={w.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {w.product_name ?? "Product"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alert at {w.target_price ? formatINR(w.target_price) : "any drop"}
                    {w.current_price != null && ` · Now ${formatINR(w.current_price)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(w.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 px-4 pb-8">
        <h2 className="text-sm font-semibold text-foreground">Set a new alert</h2>
        <div className="mt-3 space-y-2">
          {products.map((p: Product) => (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                  {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs font-semibold text-primary">{formatINR(p.price)}</p>
                </div>
                {selectedId !== p.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-xl text-xs"
                    onClick={() => {
                      setSelectedId(p.id);
                      setTargetPrice(String(Math.floor(Number(p.price) * 0.9)));
                    }}
                  >
                    <Bell className="mr-1 h-3 w-3" />
                    Alert me
                  </Button>
                ) : null}
              </div>
              {selectedId === p.id && (
                <div className="mt-3 flex gap-2">
                  <Input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Target price"
                    className="rounded-xl"
                  />
                  <Button
                    size="sm"
                    className="shrink-0 rounded-xl"
                    disabled={addMutation.isPending}
                    onClick={() =>
                      addMutation.mutate({
                        product_id: p.id,
                        target_price: targetPrice ? Number(targetPrice) : undefined,
                      })
                    }
                  >
                    <TrendingDown className="mr-1 h-3 w-3" />
                    Set
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}