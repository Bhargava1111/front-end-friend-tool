import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/types";

/** Cheapest active pack, preferring the admin-marked default. */
export function pickDefaultVariant(variants: ProductVariant[] | undefined | null) {
  const list = (variants ?? []).filter((v) => v.is_active !== false);
  if (list.length === 0) return null;
  return list.find((v) => v.is_default) ?? list.find((v) => v.stock > 0) ?? list[0];
}

const UNIT_GROUPS: Array<{ key: string; label: string; units: string[] }> = [
  { key: "weight", label: "Weight", units: ["g", "kg"] },
  { key: "volume", label: "Volume", units: ["ml", "l"] },
  { key: "pieces", label: "Pieces", units: ["pcs"] },
];

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variant: ProductVariant) => void;
}) {
  const active = variants.filter((v) => v.is_active !== false);
  if (active.length === 0) return null;

  const groups = UNIT_GROUPS.map((g) => ({
    ...g,
    items: active.filter((v) => g.units.includes(v.unit)),
  })).filter((g) => g.items.length > 0);
  const grouped = groups.length > 0 ? groups : [{ key: "all", label: "Pack size", items: active }];

  return (
    <div className="mt-5 space-y-4">
      {grouped.map((group) => (
        <div key={group.key}>
          <h2 className="text-sm font-semibold text-foreground">
            {grouped.length > 1 ? group.label : "Pack size"}
          </h2>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {group.items.map((v) => {
              const out = v.stock <= 0;
              const selected = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={selected}
                  onClick={() => onSelect(v)}
                  className={cn(
                    "min-w-[92px] shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-foreground",
                    out && "opacity-45",
                  )}
                >
                  <span className="block text-xs font-semibold">{v.label}</span>
                  <span className="block text-[13px] font-bold">{formatINR(v.price)}</span>
                  {v.mrp && Number(v.mrp) > Number(v.price) && (
                    <span className="block text-[10px] text-muted-foreground line-through">
                      {formatINR(v.mrp)}
                    </span>
                  )}
                  {out && <span className="block text-[10px] font-medium">Out of stock</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
