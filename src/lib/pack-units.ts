/** Canonical pack-size units for grocery products. */
export const CANONICAL_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;
export type CanonicalUnit = (typeof CANONICAL_UNITS)[number];

const UNIT_ALIASES: Record<string, CanonicalUnit> = {
  g: "g",
  gram: "g",
  grams: "g",
  gm: "g",
  gms: "g",
  kg: "kg",
  kilo: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kgs: "kg",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  lt: "l",
  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pack: "pcs",
  unit: "pcs",
};

export function normalizeUnit(raw: string | null | undefined, fallback: CanonicalUnit = "g"): CanonicalUnit {
  const key = (raw ?? "").trim().toLowerCase();
  if (UNIT_ALIASES[key]) return UNIT_ALIASES[key];
  if (CANONICAL_UNITS.includes(key as CanonicalUnit)) return key as CanonicalUnit;
  return fallback;
}

/** Parse labels like "500 g", "1 kg", "500ml", "1 L". */
export function parsePackLabel(label: string): { value: number; unit: CanonicalUnit } | null {
  const trimmed = label.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, unit: normalizeUnit(match[2]) };
}

export function formatPackLabel(value: number | string, unit: string): string {
  return formatPackLabelCompact(value, unit, { spaced: true });
}

/** Storefront-friendly pack label: 100g, 500ml, 1 kg, 1 L */
export function formatPackLabelCompact(
  value: number | string,
  unit: string,
  options?: { spaced?: boolean },
): string {
  const num = typeof value === "string" ? Number(value) : value;
  const u = normalizeUnit(unit);
  if (!Number.isFinite(num) || num <= 0) return "";

  const displayValue =
    u === "kg" || u === "l"
      ? Number.isInteger(num)
        ? num
        : Number(num.toFixed(2))
      : Math.round(num);

  const spaced = options?.spaced ?? false;
  if (u === "kg") return spaced ? `${displayValue} kg` : `${displayValue} kg`;
  if (u === "l") return spaced ? `${displayValue} L` : `${displayValue} L`;
  if (u === "ml") return spaced ? `${displayValue} ml` : `${displayValue}ml`;
  if (u === "pcs") return spaced ? `${displayValue} pc` : `${displayValue}pc`;
  return spaced ? `${displayValue} g` : `${displayValue}g`;
}

/** Always show value + unit even when admin saved label as plain "100" or "500". */
export function formatVariantDisplayLabel(input: {
  label?: string | null;
  unit?: string | null;
  unit_value?: number | string | null;
}): string {
  const rawLabel = (input.label ?? "").trim();
  const parsed = rawLabel ? parsePackLabel(rawLabel) : null;
  if (parsed) return formatPackLabelCompact(parsed.value, parsed.unit);

  const unit = normalizeUnit(input.unit, "g");
  const value = resolveVariantValue(rawLabel, input.unit_value ?? "", unit);

  if (rawLabel && /^\d+(?:\.\d+)?$/.test(rawLabel)) {
    return formatPackLabelCompact(Number(rawLabel), unit);
  }

  if (rawLabel) return rawLabel;
  return formatPackLabelCompact(value, unit);
}

export function resolveVariantUnit(label: string, unit: string): CanonicalUnit {
  const parsed = parsePackLabel(label);
  return parsed?.unit ?? normalizeUnit(unit);
}

export function resolveVariantValue(label: string, unitValue: number | string, unit: string): number {
  const parsed = parsePackLabel(label);
  const raw = typeof unitValue === "string" ? unitValue.trim() : String(unitValue);
  const numeric = raw === "" ? NaN : Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (parsed?.value && parsed.value > 0) return parsed.value;
  return 1;
}
