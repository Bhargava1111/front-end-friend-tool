import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalyticsFilters, AnalyticsPreset, AnalyticsVisitor } from "@/lib/admin-analytics";

const PRESETS: Array<{ id: AnalyticsPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

export function AnalyticsFiltersBar({
  value,
  onChange,
  showQuery = true,
}: {
  value: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  showQuery?: boolean;
}) {
  const set = (patch: Partial<AnalyticsFilters>) => onChange({ ...value, ...patch, page: 1 });

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => set({ preset: p.id })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              value.preset === p.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={value.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={value.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showQuery && (
          <div>
            <Label className="text-xs">Search query</Label>
            <Input
              value={value.query ?? ""}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Filter by query"
            />
          </div>
        )}
        <div>
          <Label className="text-xs">Category</Label>
          <Input
            value={value.category ?? ""}
            onChange={(e) => set({ category: e.target.value })}
            placeholder="Category name"
          />
        </div>
        <div>
          <Label className="text-xs">Brand</Label>
          <Input value={value.brand ?? ""} onChange={(e) => set({ brand: e.target.value })} placeholder="Brand name" />
        </div>
        <div>
          <Label className="text-xs">Product ID</Label>
          <Input
            value={value.product ?? ""}
            onChange={(e) => set({ product: e.target.value })}
            placeholder="Product UUID"
          />
        </div>
        <div>
          <Label className="text-xs">User ID</Label>
          <Input value={value.user ?? ""} onChange={(e) => set({ user: e.target.value })} placeholder="Logged-in user" />
        </div>
        <div>
          <Label className="text-xs">Audience</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={value.visitor}
            onChange={(e) => set({ visitor: e.target.value as AnalyticsVisitor })}
          >
            <option value="all">All visitors</option>
            <option value="guest">Guest users</option>
            <option value="logged_in">Logged-in users</option>
          </select>
        </div>
      </div>
    </div>
  );
}
