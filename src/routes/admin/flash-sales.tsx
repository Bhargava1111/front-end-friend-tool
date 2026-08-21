import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Zap, Clock, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/flash-sales")({
  head: () => ({
    meta: [
      { title: "Flash Sales — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Schedule and manage flash sale events." },
    ],
  }),
  component: FlashSalesPage,
});

const SALES = [
  {
    id: "1",
    name: "Weekend Mega Sale",
    discount: "Up to 50%",
    start: "Fri 6:00 PM",
    end: "Sun 11:59 PM",
    products: 48,
    status: "active" as const,
    revenue: "₹1,84,500",
  },
  {
    id: "2",
    name: "Morning Flash — Oils",
    discount: "30% off",
    start: "Daily 7:00 AM",
    end: "Daily 10:00 AM",
    products: 12,
    status: "active" as const,
    revenue: "₹42,100",
  },
  {
    id: "3",
    name: "Diwali Pre-Sale",
    discount: "Up to 40%",
    start: "Oct 15",
    end: "Oct 31",
    products: 85,
    status: "scheduled" as const,
    revenue: "—",
  },
  {
    id: "4",
    name: "Under ₹99 Clearance",
    discount: "Flat pricing",
    start: "Ended",
    end: "Last week",
    products: 32,
    status: "ended" as const,
    revenue: "₹96,200",
  },
];

function FlashSalesPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Flash sales</h1>
          <p className="text-sm text-muted-foreground">Time-limited deals that drive urgency</p>
        </div>
        <Button size="sm" className="rounded-xl text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New flash sale
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active sales", value: "2", icon: Zap },
          { label: "Products on sale", value: "60", icon: ToggleRight },
          { label: "Revenue (7d)", value: "₹2.2L", icon: Clock },
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

      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/20 p-4">
          <h2 className="text-sm font-semibold text-foreground">Create flash sale</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Sale name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl" placeholder="e.g. Midweek Madness" />
            </div>
            <div>
              <Label>Max discount</Label>
              <Input type="number" className="mt-1 rounded-xl" placeholder="50" />
            </div>
            <div>
              <Label>Start date & time</Label>
              <Input type="datetime-local" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>End date & time</Label>
              <Input type="datetime-local" className="mt-1 rounded-xl" />
            </div>
          </div>
          <Button
            className="mt-3 rounded-xl text-xs"
            onClick={() => {
              toast.success("Flash sale scheduled!");
              setShowForm(false);
              setName("");
            }}
          >
            Schedule sale
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {SALES.map((sale) => (
          <div
            key={sale.id}
            className={cn(
              "rounded-2xl border p-4",
              sale.status === "active"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className={cn("h-4 w-4", sale.status === "active" ? "text-destructive" : "text-muted-foreground")} />
                  <p className="text-sm font-bold text-foreground">{sale.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                      sale.status === "active"
                        ? "bg-destructive text-destructive-foreground"
                        : sale.status === "scheduled"
                          ? "bg-accent-soft text-accent-foreground"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {sale.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sale.discount} · {sale.products} products · {sale.start} → {sale.end}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{sale.revenue}</p>
                <p className="text-[10px] text-muted-foreground">Revenue</p>
              </div>
            </div>
            {sale.status === "active" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl text-xs">
                  <ToggleLeft className="mr-1 h-3 w-3" />
                  Pause
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs">
                  Edit products
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
