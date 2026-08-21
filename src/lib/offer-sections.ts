import type { Product } from "@/lib/types";

export const DEFAULT_OFFER_SECTIONS = [
  { key: "flash_sale", label: "Flash sale" },
  { key: "todays_deals", label: "Today's deals" },
  { key: "under_99", label: "Under ₹99" },
  { key: "festive_picks", label: "Festive picks" },
  { key: "combo_packs", label: "Combo packs" },
  { key: "custom_offers", label: "Custom offers" },
] as const;

export type OfferSectionKey = (typeof DEFAULT_OFFER_SECTIONS)[number]["key"];

export type HomeOfferSectionDef = {
  id: string;
  key: string;
  title: string;
  subtitle?: string;
  layout: "rail" | "countdown_rail" | "budget_rail" | "deal_card";
  fallback_rule: string;
  see_all_tab?: string;
  max_price?: number;
  max_products: number;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  placed_count?: number;
  display_count?: number;
  resolved_product_ids?: string[];
};

export type HomeSectionBlock = HomeOfferSectionDef & {
  products: Product[];
};

export type OfferSectionsMap = Partial<Record<string, Product[]>>;

export function offerSectionLabel(key: string, sections?: Array<{ key: string; title?: string; label?: string }>) {
  const fromApi = sections?.find((s) => s.key === key);
  if (fromApi) return fromApi.title ?? fromApi.label ?? key;
  return DEFAULT_OFFER_SECTIONS.find((s) => s.key === key)?.label ?? key;
}

export const SECTION_LAYOUTS = [
  { value: "rail", label: "Product rail" },
  { value: "countdown_rail", label: "Flash sale (countdown)" },
  { value: "budget_rail", label: "Budget store rail" },
  { value: "deal_card", label: "Deal of the day card" },
] as const;

export const FALLBACK_RULES = [
  { value: "manual", label: "Manual products only" },
  { value: "discounted", label: "Top discounted" },
  { value: "featured", label: "Featured products" },
  { value: "under_99", label: "Under ₹99" },
  { value: "best_seller", label: "Best sellers" },
  { value: "newest", label: "Newly added" },
  { value: "recommended", label: "Recommended" },
  { value: "combo", label: "Combo packs" },
] as const;

// Back-compat alias used by admin products page
export const OFFER_SECTIONS = DEFAULT_OFFER_SECTIONS;
