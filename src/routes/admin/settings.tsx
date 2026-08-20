import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { adminListSettingsClient, adminSaveSettingsClient } from "@/lib/admin-client.functions";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { adminListSettings, adminSaveSettings } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import { DEFAULT_SETTINGS } from "@/lib/commerce";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const list = useAdminFn(adminListSettings, adminListSettingsClient);
  const save = useAdminFn(adminSaveSettings, adminSaveSettingsClient);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT_SETTINGS });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => list() as Promise<Array<{ key: string; value: unknown }>>,
  });

  useEffect(() => {
    if (!data) return;
    const next = { ...DEFAULT_SETTINGS };
    for (const row of data) (next as unknown as Record<string, unknown>)[row.key] = row.value;
    setForm(next);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          entries: [
            { key: "delivery_fee", value: Number(form.delivery_fee) || 0 },
            { key: "free_delivery_above", value: Number(form.free_delivery_above) || 0 },
            { key: "tax_rate", value: Number(form.tax_rate) || 0 },
            { key: "maintenance_mode", value: !!form.maintenance_mode },
            { key: "support_phone", value: form.support_phone },
            { key: "support_email", value: form.support_email },
          ],
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-meta"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isError) return <ErrorState description="Could not load settings." onRetry={() => refetch()} />;
  if (isLoading) return <Skeleton className="h-80 w-full max-w-xl" />;

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-bold text-foreground">Store settings</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Delivery charges, taxes, support contacts and maintenance mode
      </p>

      <div className="space-y-5">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <h2 className="text-sm font-bold">Delivery charges</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-fee">Delivery fee ₹</Label>
              <Input
                id="s-fee"
                type="number"
                value={form.delivery_fee}
                onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-free">Free above ₹</Label>
              <Input
                id="s-free"
                type="number"
                value={form.free_delivery_above}
                onChange={(e) => setForm({ ...form, free_delivery_above: Number(e.target.value) })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <h2 className="text-sm font-bold">Taxes</h2>
          <div className="space-y-1.5">
            <Label htmlFor="s-tax">Tax rate %</Label>
            <Input
              id="s-tax"
              type="number"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted-foreground">
              Applied to the order value after any coupon discount.
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <h2 className="text-sm font-bold">Support contacts</h2>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Phone</Label>
            <Input
              id="s-phone"
              value={form.support_phone}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email</Label>
            <Input
              id="s-email"
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 card-elevated">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">Maintenance mode</h2>
              <p className="text-xs text-muted-foreground">
                Shows the maintenance screen to shoppers instead of the store.
              </p>
            </div>
            <Switch
              checked={!!form.maintenance_mode}
              onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })}
              aria-label="Maintenance mode"
            />
          </div>
        </section>

        <Button className="h-11 w-full rounded-xl" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
