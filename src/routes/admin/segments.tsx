import { createFileRoute } from "@tanstack/react-router";
import { Users, Crown, Star, ShoppingBag, TrendingUp, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/segments")({
  head: () => ({
    meta: [
      { title: "Customer Segments — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Group customers for targeted marketing and offers." },
    ],
  }),
  component: SegmentsPage,
});

const SEGMENTS = [
  {
    id: "1",
    name: "VIP Customers",
    icon: Crown,
    criteria: "₹15,000+ lifetime spend",
    count: 142,
    avgOrder: "₹1,240",
    color: "bg-accent-soft text-accent-foreground",
    growth: "+12%",
  },
  {
    id: "2",
    name: "Regular Shoppers",
    icon: Star,
    criteria: "5+ orders in last 90 days",
    count: 890,
    avgOrder: "₹680",
    color: "bg-primary-soft text-primary",
    growth: "+8%",
  },
  {
    id: "3",
    name: "At Risk",
    icon: TrendingUp,
    criteria: "No order in 60+ days",
    count: 320,
    avgOrder: "₹420",
    color: "bg-destructive/10 text-destructive",
    growth: "-5%",
  },
  {
    id: "4",
    name: "New Customers",
    icon: Users,
    criteria: "First order in last 30 days",
    count: 215,
    avgOrder: "₹520",
    color: "bg-secondary text-foreground",
    growth: "+22%",
  },
  {
    id: "5",
    name: "Pooja Buyers",
    icon: ShoppingBag,
    criteria: "3+ pooja category orders",
    count: 480,
    avgOrder: "₹380",
    color: "bg-accent/20 text-accent-foreground",
    growth: "+15%",
  },
  {
    id: "6",
    name: "Bulk Order Clients",
    icon: Mail,
    criteria: "1+ bulk order request",
    count: 38,
    avgOrder: "₹4,200",
    color: "bg-primary/10 text-primary",
    growth: "+3%",
  },
];

function SegmentsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Customer segments</h1>
          <p className="text-sm text-muted-foreground">Target the right customers with the right offers</p>
        </div>
        <Button
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => toast.info("Custom segment builder coming soon")}
        >
          Create segment
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total segments", value: String(SEGMENTS.length) },
          { label: "Customers segmented", value: "2,085" },
          { label: "Campaigns sent (30d)", value: "18" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENTS.map((seg) => {
          const Icon = seg.icon;
          return (
            <div key={seg.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", seg.color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    seg.growth.startsWith("+") ? "text-primary" : "text-destructive",
                  )}
                >
                  {seg.growth}
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">{seg.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{seg.criteria}</p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-lg font-bold text-foreground">{seg.count.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">customers</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{seg.avgOrder}</p>
                  <p className="text-[10px] text-muted-foreground">avg order</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => toast.success(`Campaign draft created for ${seg.name}`)}
                >
                  Send offer
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-xs">
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
