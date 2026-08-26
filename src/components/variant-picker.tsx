import { formatINR } from "@/lib/format";
import { formatVariantDisplayLabel, normalizeUnit, parsePackLabel } from "@/lib/pack-units";
import { cn } from "@/lib/utils";
import { QtyPriceTable } from "@/components/qty-price-table";
import type { ProductVariant } from "@/lib/types";

/** Cheapest active pack, preferring the admin-marked default. */
export function pickDefaultVariant(variants: ProductVariant[] | undefined | null) {
  const list = (variants ?? []).filter((v) => v.is_active !== false);
  if (list.length === 0) return null;
  return list.find((v) => v.is_default) ?? list.find((v) => v.stock > 0) ?? list[0];
}

function variantUnit(v: ProductVariant) {
  return normalizeUnit(v.unit, parsePackLabel(v.label)?.unit ?? "g");
}

function variantLabel(v: ProductVariant) {
  return formatVariantDisplayLabel({
    label: v.label,
    unit: variantUnit(v),
    unit_value: v.unit_value,
  });
}

const UNIT_GROUPS: Array<{ key: string; label: string; units: string[] }> = [
  { key: "weight", label: "Weight", units: ["g", "kg"] },
  { key: "volume", label: "Volume", units: ["ml", "l"] },
  { key: "pieces", label: "Pieces", units: ["pcs"] },
];

type PriceTier = {
  min_qty?: number;
  max_qty?: number;
  unit_price?: number;
};

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
  priceTiers,
  unitPrice,
  mrp,
  maxQty,
  selectedQty,
  onSelectQty,
}: {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variant: ProductVariant) => void;
  priceTiers?: PriceTier[] | null;
  unitPrice?: number;
  mrp?: number | null;
  maxQty?: number;
  selectedQty?: number;
  onSelectQty?: (qty: number) => void;
}) {
  const active = variants.filter((v) => v.is_active !== false);
  if (active.length === 0) return null;

  const groups = UNIT_GROUPS.map((g) => ({
    ...g,
    items: active.filter((v) => g.units.includes(variantUnit(v))),
  })).filter((g) => g.items.length > 0);
  const grouped = groups.length > 0 ? groups : [{ key: "all", label: "Pack size", items: active }];
  const showQtyTable =
    unitPrice != null && selectedQty != null && onSelectQty != null;

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card/40 p-4">
      <h2 className="text-sm font-semibold text-foreground">Pack sizes / variants</h2>

      <div className="mt-3 space-y-4">
        {grouped.map((group) => (
          <div key={group.key}>
            {grouped.length > 1 && (
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
            )}
            <div
              className={cn(
                "no-scrollbar flex gap-2 overflow-x-auto pb-1",
                grouped.length > 1 && "mt-2",
              )}
            >
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
                    <span className="block text-xs font-semibold">{variantLabel(v)}</span>
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

      {showQtyTable && (
        <>
          <p className="mt-4 border-t border-border pt-4 text-sm font-semibold text-foreground">
            Qty price tiers
          </p>
          <QtyPriceTable
            embedded
            unitPrice={unitPrice}
            mrp={mrp}
            maxQty={maxQty ?? 999}
            selectedQty={selectedQty}
            onSelectQty={onSelectQty}
            adminTiers={priceTiers}
          />
        </>
      )}
    </div>
  );
}
