import {
  formatPackLabel,
  normalizeUnit,
  parsePackLabel,
  resolveVariantUnit,
  resolveVariantValue,
} from "@/lib/pack-units";

export type VariantRow = {
  id?: string;
  label: string;
  unit: string;
  unit_value: string;
  price: string;
  mrp: string;
  stock: string;
  sku: string;
  image_url: string;
  is_default: boolean;
  is_active: boolean;
};

export type PriceTierRow = {
  min_qty: string;
  max_qty: string;
  unit_price: string;
};

export type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  price: string;
  mrp: string;
  stock: string;
  weight: string;
  category_id: string;
  image_url: string;
  video_url: string;
  gallery: string;
  description: string;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  benefits: string;
  shelf_life: string;
  origin: string;
  variants: VariantRow[];
  price_tiers: PriceTierRow[];
  is_combo: boolean;
  combo_items: Array<{ product_id: string; quantity: string }>;
};

export const UNITS = ["g", "kg", "ml", "l", "pcs"] as const;

export const PACK_PRESETS: Array<{ label: string; unit: string; unit_value: string }> = [
  { label: "50 g", unit: "g", unit_value: "50" },
  { label: "100 g", unit: "g", unit_value: "100" },
  { label: "250 g", unit: "g", unit_value: "250" },
  { label: "500 g", unit: "g", unit_value: "500" },
  { label: "1 kg", unit: "kg", unit_value: "1" },
  { label: "200 ml", unit: "ml", unit_value: "200" },
  { label: "500 ml", unit: "ml", unit_value: "500" },
  { label: "1 L", unit: "l", unit_value: "1" },
  { label: "1 pc", unit: "pcs", unit_value: "1" },
];

export const emptyVariant: VariantRow = {
  label: "",
  unit: "g",
  unit_value: "",
  price: "",
  mrp: "",
  stock: "0",
  sku: "",
  image_url: "",
  is_default: false,
  is_active: true,
};

/** Keep label, unit and numeric value in sync for admin forms and API payloads. */
export function normalizeVariantRow(v: Partial<VariantRow> & Pick<VariantRow, "label" | "unit" | "unit_value">): VariantRow {
  const parsed = parsePackLabel(v.label);
  const unit = resolveVariantUnit(v.label, v.unit);
  const value = resolveVariantValue(v.label, v.unit_value, unit);
  const label = v.label.trim() || formatPackLabel(value, unit);

  return {
    id: v.id,
    label,
    unit,
    unit_value: String(value),
    price: v.price ?? "",
    mrp: v.mrp ?? "",
    stock: v.stock ?? "0",
    sku: v.sku ?? "",
    image_url: v.image_url ?? "",
    is_default: v.is_default ?? false,
    is_active: v.is_active ?? true,
  };
}

export function syncVariantPatch(
  current: VariantRow,
  patch: Partial<VariantRow>,
): VariantRow {
  const next = { ...current, ...patch };

  if (patch.label != null && patch.label !== current.label) {
    const parsed = parsePackLabel(patch.label);
    if (parsed) {
      return normalizeVariantRow({
        ...next,
        unit: parsed.unit,
        unit_value: String(parsed.value),
      });
    }
    return normalizeVariantRow(next);
  }

  if (patch.unit != null || patch.unit_value != null) {
    const unit = normalizeUnit(patch.unit ?? next.unit);
    const value = resolveVariantValue(next.label, patch.unit_value ?? next.unit_value, unit);
    return normalizeVariantRow({
      ...next,
      unit,
      unit_value: String(value),
      label: formatPackLabel(value, unit) || next.label,
    });
  }

  return normalizeVariantRow(next);
}

export const emptyPriceTier: PriceTierRow = {
  min_qty: "1",
  max_qty: "2",
  unit_price: "",
};

export const emptyProductForm: ProductForm = {
  name: "",
  slug: "",
  price: "",
  mrp: "",
  stock: "0",
  weight: "",
  category_id: "",
  image_url: "",
  video_url: "",
  gallery: "",
  description: "",
  is_active: true,
  is_featured: false,
  is_best_seller: false,
  benefits: "",
  shelf_life: "",
  origin: "",
  variants: [],
  price_tiers: [],
  is_combo: false,
  combo_items: [],
};

export function productFormToPayload(f: ProductForm) {
  return {
    id: f.id,
    name: f.name,
    slug: f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    price: Number(f.price),
    mrp: f.mrp ? Number(f.mrp) : null,
    stock: Number(f.stock),
    weight: f.weight || null,
    category_id: f.category_id || null,
    image_url: f.image_url || "",
    video_url: f.video_url || "",
    gallery: f.gallery
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    images: f.gallery
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    description: f.description || "",
    is_active: f.is_active,
    is_featured: f.is_featured,
    is_best_seller: f.is_best_seller,
    benefits: f.benefits
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    shelf_life: f.shelf_life || "",
    origin: f.origin || "",
    variants: f.variants.map((v) => {
      const row = normalizeVariantRow(v);
      return {
        label: row.label,
        unit: row.unit,
        unit_value: Number(row.unit_value || 0),
        price: Number(row.price || 0),
        mrp: row.mrp ? Number(row.mrp) : null,
        stock: Number(row.stock || 0),
        sku: row.sku || "",
        image_url: row.image_url || "",
        is_default: row.is_default,
        is_active: row.is_active,
      };
    }),
    price_tiers: f.price_tiers
      .map((t) => ({
        min_qty: Number(t.min_qty || 1),
        max_qty: Number(t.max_qty || 999),
        unit_price: Number(t.unit_price || 0),
      }))
      .filter((t) => t.min_qty >= 1 && t.max_qty >= t.min_qty && t.unit_price > 0),
    is_combo: f.is_combo,
    combo_items: f.is_combo
      ? f.combo_items
          .filter((item) => item.product_id)
          .map((item) => ({
            product_id: item.product_id,
            quantity: Number(item.quantity || 1),
          }))
      : [],
  };
}

export function productToForm(p: {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp?: number | null;
  stock: number;
  weight?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  gallery?: string[];
  images?: string[];
  description?: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  benefits?: string[] | null;
  shelf_life?: string | null;
  origin?: string | null;
  variants?: Array<{
    id?: string;
    label: string;
    unit: string;
    unit_value?: number;
    price: number;
    mrp?: number | null;
    stock: number;
    sku?: string | null;
    image_url?: string | null;
    is_default: boolean;
    is_active: boolean;
  }>;
  price_tiers?: Array<{
    min_qty?: number;
    max_qty?: number;
    unit_price?: number;
  }> | null;
  is_combo?: boolean;
  combo_items?: Array<{ product_id: string; quantity?: number }>;
}): ProductForm {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: String(p.price),
    mrp: p.mrp ? String(p.mrp) : "",
    stock: String(p.stock),
    weight: p.weight ?? "",
    category_id: p.category_id ?? "",
    image_url: p.image_url ?? "",
    video_url: p.video_url ?? "",
    gallery: (p.gallery ?? p.images ?? []).join("\n"),
    description: p.description ?? "",
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_best_seller: p.is_best_seller,
    benefits: (p.benefits ?? []).join("\n"),
    shelf_life: p.shelf_life ?? "",
    origin: p.origin ?? "",
    variants: (p.variants ?? []).map((v) =>
      normalizeVariantRow({
        id: v.id,
        label: v.label,
        unit: v.unit,
        unit_value: String(v.unit_value ?? 0),
        price: String(v.price),
        mrp: v.mrp ? String(v.mrp) : "",
        stock: String(v.stock),
        sku: v.sku ?? "",
        image_url: v.image_url ?? "",
        is_default: v.is_default,
        is_active: v.is_active,
      }),
    ),
    price_tiers: (p.price_tiers ?? []).map((t) => ({
      min_qty: String(t.min_qty ?? 1),
      max_qty: String(t.max_qty ?? 999),
      unit_price: String(t.unit_price ?? ""),
    })),
    is_combo: Boolean(p.is_combo),
    combo_items: (p.combo_items ?? []).map((item) => ({
      product_id: item.product_id,
      quantity: String(item.quantity ?? 1),
    })),
  };
}
