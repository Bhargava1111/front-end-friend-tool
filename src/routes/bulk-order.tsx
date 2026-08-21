import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Package, Phone, Check, Truck, Percent } from "lucide-react";
import { toast } from "sonner";
import { getHomeData } from "@/lib/catalog.functions";
import { submitBulkOrderClient } from "@/lib/platform.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "@/components/motion";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const query = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

const BULK_TIERS = [
  { min: 10, discount: 5, label: "10+ units" },
  { min: 25, discount: 10, label: "25+ units" },
  { min: 50, discount: 15, label: "50+ units" },
  { min: 100, discount: 20, label: "100+ units" },
];

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Bulk Orders — Wholesale & Events | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Order groceries and pooja essentials in bulk for events, temples and businesses. Up to 20% off.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(query),
  component: BulkOrderPage,
});

function BulkOrderPage() {
  const { data } = useSuspenseQuery(query);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState("");
  const [qty, setQty] = useState("25");

  const staples = (data.bestSelling ?? []).slice(0, 6);
  const quantity = Number(qty) || 0;
  const tier = [...BULK_TIERS].reverse().find((t) => quantity >= t.min);
  const discount = tier?.discount ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !items.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await submitBulkOrderClient({
        name: name.trim(),
        phone: phone.trim(),
        items_text: items.trim(),
        estimated_qty: quantity,
      });
      toast.success("Bulk order request submitted!", {
        description: "Our team will call you within 2 hours with a custom quote.",
      });
      setName("");
      setPhone("");
      setItems("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    }
  }

  return (
    <PageShell>
      <TopBar title="Bulk orders" subtitle="Events, temples & businesses" backTo="/" />

      <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground lg:mx-0">
        <Package className="h-8 w-8" />
        <h1 className="mt-3 text-xl font-bold">Order in bulk, save more</h1>
        <p className="mt-1.5 text-sm text-primary-foreground/80">
          Up to 20% off on large orders. Free delivery for orders above ₹5,000.
        </p>
      </section>

      <Reveal className="mt-5 px-4 lg:px-0">
        <div className="grid grid-cols-4 gap-2">
          {BULK_TIERS.map((t) => (
            <div
              key={t.min}
              className={cn(
                "rounded-xl border p-3 text-center",
                tier?.min === t.min
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card",
              )}
            >
              <p className="text-lg font-bold text-foreground">{t.discount}%</p>
              <p className="text-[10px] text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-6 px-4 lg:px-0">
        <h2 className="text-sm font-semibold text-foreground">Popular bulk items</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {staples.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-accent-soft">
                {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatINR(p.price)} / unit
                  {discount > 0 && (
                    <span className="ml-1 font-semibold text-primary">
                      → {formatINR(Number(p.price) * (1 - discount / 100))}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-8 lg:px-0">
        <h2 className="text-sm font-semibold text-foreground">Request a quote</h2>

        <div>
          <Label htmlFor="name">Name / Organisation</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 rounded-xl" required />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl" required />
        </div>
        <div>
          <Label htmlFor="qty">Estimated quantity (total units)</Label>
          <Input id="qty" type="number" min={10} value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1.5 rounded-xl" />
          {discount > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
              <Percent className="h-3 w-3" /> You qualify for {discount}% bulk discount
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="items">Items needed</Label>
          <Textarea
            id="items"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="e.g. 50kg Sona Masoori rice, 20L groundnut oil, 100 agarbatti packs…"
            className="mt-1.5 rounded-xl"
            rows={4}
            required
          />
        </div>
        <Button type="submit" className="h-12 w-full rounded-xl">
          Submit bulk order request
        </Button>
      </form>

      <Reveal className="mx-4 mb-8 grid gap-3 sm:grid-cols-3 lg:mx-0">
        {[
          { icon: Check, title: "Custom pricing", copy: "Quotes within 2 hours" },
          { icon: Truck, title: "Free delivery", copy: "On orders above ₹5,000" },
          { icon: Phone, title: "Dedicated support", copy: "Bulk order helpline" },
        ].map(({ icon: Icon, title, copy }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{copy}</p>
          </div>
        ))}
      </Reveal>
    </PageShell>
  );
}
