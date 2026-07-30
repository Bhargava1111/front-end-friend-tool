import type { Product } from "./types";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "discount" | "newest";

export type ProductFilters = {
  min: number;
  max: number;
  brands: string[];
  discount: number;
  inStock: boolean;
  sort: SortKey;
};

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "relevance", label: "Popularity" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "discount", label: "Discount: high to low" },
  { key: "newest", label: "Newest first" },
];

export const DISCOUNT_STEPS = [10, 25, 40, 50];

export const EMPTY_FILTERS: ProductFilters = {
  min: 0,
  max: 0,
  brands: [],
  discount: 0,
  inStock: false,
  sort: "relevance",
};

export function discountOf(p: Product) {
  const mrp = Number(p.mrp ?? 0);
  const price = Number(p.price);
  return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
}

export function priceBounds(products: Product[]) {
  if (products.length === 0) return { min: 0, max: 0 };
  const prices = products.map((p) => Number(p.price));
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

export function activeFilterCount(f: ProductFilters, bounds: { min: number; max: number }) {
  let n = 0;
  if (f.min > bounds.min || (f.max > 0 && f.max < bounds.max)) n += 1;
  if (f.brands.length) n += 1;
  if (f.discount > 0) n += 1;
  if (f.inStock) n += 1;
  return n;
}

export function applyFilters(products: Product[], f: ProductFilters) {
  const filtered = products.filter((p) => {
    const price = Number(p.price);
    if (f.min && price < f.min) return false;
    if (f.max && price > f.max) return false;
    if (f.brands.length && !(p.brand_id && f.brands.includes(p.brand_id))) return false;
    if (f.discount && discountOf(p) < f.discount) return false;
    if (f.inStock && p.stock <= 0) return false;
    return true;
  });

  const sorted = [...filtered];
  if (f.sort === "price_asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
  else if (f.sort === "price_desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
  else if (f.sort === "discount") sorted.sort((a, b) => discountOf(b) - discountOf(a));
  else if (f.sort === "newest") sorted.reverse();
  return sorted;
}
