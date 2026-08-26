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
  const num = typeof value === "string" ? Number(value) : value;
  const u = normalizeUnit(unit);
  if (!Number.isFinite(num) || num <= 0) return "";

  const displayValue =
    u === "kg" || u === "l"
      ? Number.isInteger(num)
        ? num
        : Number(num.toFixed(2))
      : Math.round(num);

  const displayUnit = u === "l" ? "L" : u === "pcs" ? "pc" : u;
  return `${displayValue} ${displayUnit}`;
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
