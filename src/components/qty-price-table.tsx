import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type QtyPriceTier = {
  label: string;
  min: number;
  max: number;
  unitPrice: number;
  profitPct: number;
};

type AdminTier = {
  min_qty?: number;
  max_qty?: number;
  unit_price?: number;
};

function normalizeAdminTiers(adminTiers?: AdminTier[] | null) {
  return (adminTiers ?? [])
    .map((t) => ({
      min: Number(t.min_qty ?? 1),
      max: Number(t.max_qty ?? 999),
      unitPrice: Number(t.unit_price ?? 0),
    }))
    .filter((t) => t.min >= 1 && t.max >= t.min && t.unitPrice > 0)
    .sort((a, b) => a.min - b.min || a.max - b.max);
}

/** Base tier price used to scale qty breaks across pack sizes. */
export function referenceTierUnitPrice(adminTiers: AdminTier[] | null | undefined, fallback: number) {
  const tiers = normalizeAdminTiers(adminTiers);
  const coverOne = tiers.find((t) => t.min <= 1 && t.max >= 1);
  return coverOne?.unitPrice ?? tiers[0]?.unitPrice ?? fallback;
}

/** Scale admin qty tiers to match the selected pack variant price. */
export function resolveVariantPriceTiers(
  adminTiers: AdminTier[] | null | undefined,
  variantPrice: number,
  referencePrice: number,
): AdminTier[] | null {
  const tiers = adminTiers ?? [];
  if (tiers.length === 0) return null;
  if (referencePrice <= 0) return tiers;
  const ratio = variantPrice / referencePrice;
  if (Math.abs(ratio - 1) < 0.0001) return tiers;
  return tiers.map((t) => ({
    min_qty: t.min_qty,
    max_qty: t.max_qty,
    unit_price: Math.round(Number(t.unit_price ?? 0) * ratio * 100) / 100,
  }));
}

function profitPct(unitPrice: number, mrp: number | null | undefined) {
  return mrp && mrp > unitPrice ? Math.round(((mrp - unitPrice) / mrp) * 10000) / 100 : 0;
}

/** Prefer admin-configured tiers; otherwise fall back to a simple display range. */
export function buildQtyPriceTiers(
  unitPrice: number,
  mrp: number | null | undefined,
  maxQty: number,
  adminTiers?: AdminTier[] | null,
): QtyPriceTier[] {
  const cap = Math.max(1, Math.min(999, maxQty || 999));
  const configured = normalizeAdminTiers(adminTiers);

  if (configured.length > 0) {
    return configured.map((t) => ({
      label: t.min === t.max ? `${t.min}` : `${t.min} - ${t.max}`,
      min: t.min,
      max: Math.min(t.max, cap),
      unitPrice: t.unitPrice,
      profitPct: profitPct(t.unitPrice, mrp),
    }));
  }

  const pct = profitPct(unitPrice, mrp);
  if (cap === 1) {
    return [{ label: "1", min: 1, max: 1, unitPrice, profitPct: pct }];
  }

  const mid = Math.min(2, cap);
  const highStart = Math.min(3, cap);
  const tiers: QtyPriceTier[] = [
    {
      label: mid === 1 ? "1" : `1 - ${mid}`,
      min: 1,
      max: mid,
      unitPrice,
      profitPct: pct,
    },
  ];

  if (highStart <= cap && highStart > mid) {
    tiers.push({
      label: highStart === cap ? `${highStart}` : `${highStart} - ${cap}`,
      min: highStart,
      max: cap,
      unitPrice,
      profitPct: pct,
    });
  }

  return tiers;
}

export function unitPriceForQty(
  qty: number,
  basePrice: number,
  adminTiers?: AdminTier[] | null,
) {
  const tiers = normalizeAdminTiers(adminTiers);

  for (const t of tiers) {
    if (qty >= t.min && qty <= t.max) return t.unitPrice;
  }
  return basePrice;
}

export function QtyPriceTable({
  unitPrice,
  mrp,
  maxQty,
  selectedQty,
  onSelectQty,
  adminTiers,
  embedded = false,
}: {
  unitPrice: number;
  mrp: number | null | undefined;
  maxQty: number;
  selectedQty: number;
  onSelectQty: (qty: number) => void;
  adminTiers?: AdminTier[] | null;
  embedded?: boolean;
}) {
  const cap = Math.max(1, Math.min(999, maxQty || 999));
  const tiers = buildQtyPriceTiers(unitPrice, mrp, cap, adminTiers);
  const displayMrp = mrp && mrp > 0 ? Number(mrp) : unitPrice;
  const activeUnit = unitPriceForQty(selectedQty, unitPrice, adminTiers);

  return (
    <div className={embedded ? "mt-2 space-y-2" : "mt-4 space-y-2"}>
      <p className="text-sm text-muted-foreground">
        MRP:{" "}
        <span className="font-semibold text-foreground">
          {formatINR(displayMrp)}
          <span className="font-normal text-muted-foreground">/unit</span>
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Order between <span className="font-medium text-foreground">1 - {cap}</span> quantity
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="bg-secondary/60 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
              >
                Qty
              </th>
              {tiers.map((tier) => {
                const active = selectedQty >= tier.min && selectedQty <= tier.max;
                return (
                  <td key={`qty-${tier.label}`} className="border-l border-border p-0">
                    <button
                      type="button"
                      onClick={() => onSelectQty(tier.min)}
                      className={cn(
                        "w-full px-2 py-2.5 text-center text-xs font-semibold transition-colors",
                        active ? "bg-primary-soft text-primary" : "text-foreground hover:bg-secondary/50",
                      )}
                    >
                      {tier.label}
                    </button>
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="bg-secondary/60 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
              >
                ₹/pc
              </th>
              {tiers.map((tier) => {
                const active = selectedQty >= tier.min && selectedQty <= tier.max;
                return (
                  <td
                    key={`price-${tier.label}`}
                    className={cn(
                      "border-l border-border px-2 py-2.5 text-center text-sm font-bold",
                      active ? "bg-primary-soft text-primary" : "text-foreground",
                    )}
                  >
                    {formatINR(tier.unitPrice)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <th
                scope="row"
                className="bg-secondary/60 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
              >
                Profit
              </th>
              {tiers.map((tier) => {
                const active = selectedQty >= tier.min && selectedQty <= tier.max;
                return (
                  <td
                    key={`profit-${tier.label}`}
                    className={cn(
                      "border-l border-border px-2 py-2.5 text-center text-sm font-semibold",
                      active ? "bg-primary-soft" : "",
                      tier.profitPct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {tier.profitPct > 0 ? `${tier.profitPct.toFixed(2)}%` : "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {selectedQty > 1 && (
        <p className="text-xs text-muted-foreground">
          Line total:{" "}
          <span className="font-semibold text-foreground">
            {formatINR(activeUnit * selectedQty)}
          </span>{" "}
          ({formatINR(activeUnit)} × {selectedQty})
        </p>
      )}
    </div>
  );
}
