import type { Product } from "@/lib/types";

/** Discrete qty picks from admin price tiers (e.g. 1, 5, 18, 80). */
export function productQtyOptions(product: Product): number[] {
  const tiers = product.price_tiers ?? [];
  if (tiers.length === 0) return [];
  return [...new Set(tiers.map((t) => Number(t.min_qty) || 1))].sort((a, b) => a - b);
}

export function unitPriceForQty(product: Product, qty: number, variantPrice?: number): number {
  const tiers = product.price_tiers ?? [];
  const tier = tiers.find((t) => qty >= t.min_qty && qty <= t.max_qty);
  if (tier) return Number(tier.unit_price);
  return variantPrice ?? Number(product.price);
}
