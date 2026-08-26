import type { Product } from "@/lib/types";

export const DEFAULT_OFFER_SECTIONS = [
  { key: "categories", label: "Shop by category" },
  { key: "flash_sale", label: "Flash sale" },
  { key: "todays_deals", label: "Today's deals" },
  { key: "deal_of_the_day", label: "Deal of the day" },
  { key: "under_99", label: "Under ₹99" },
  { key: "festive_picks", label: "Festive picks" },
  { key: "combo_packs", label: "Combo packs" },
  { key: "trending", label: "Trending now" },
  { key: "best_sellers", label: "Best sellers" },
  { key: "offers_strip", label: "Today's offers" },
  { key: "coupon_strip", label: "Coupons" },
  { key: "festive_banners", label: "Festival banners" },
  { key: "shop_by_need", label: "Shop by need" },
  { key: "recommended", label: "Recommended" },
  { key: "brands", label: "Featured brands" },
  { key: "recently_viewed", label: "Recently viewed" },
  { key: "service_promises", label: "Service promises" },
  { key: "newest", label: "Newly added" },
  { key: "custom_offers", label: "Custom offers" },
] as const;

export type OfferSectionKey = (typeof DEFAULT_OFFER_SECTIONS)[number]["key"];

export type HomeOfferSectionDef = {
  id: string;
  key: string;
  title: string;
  subtitle?: string;
  layout:
    | "rail"
    | "countdown_rail"
    | "budget_rail"
    | "deal_card"
    | "categories"
    | "offers_strip"
    | "coupon_strip"
    | "festive_banners"
    | "shop_by_need"
    | "brands"
    | "recently_viewed"
    | "service_promises";
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

/** Stable sort for home sections — matches admin drag order. */
export function sortHomeSections<T extends { sort_order?: number; title?: string; key?: string }>(
  sections: T[],
): T[] {
  return [...sections].sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return (a.title ?? a.key ?? "").localeCompare(b.title ?? b.key ?? "");
  });
}

/** Build ordered home sections from API payload (supports older cached responses). */
export function resolveHomeSections(data: {
  home_sections?: HomeSectionBlock[];
  section_meta?: HomeOfferSectionDef[];
  sections?: OfferSectionsMap;
  all?: Product[];
}): HomeSectionBlock[] {
  if (data.home_sections?.length) {
    return sortHomeSections(
      data.home_sections.filter((s) => s.is_active !== false && s.show_on_home !== false),
    );
  }
  const meta = data.section_meta ?? [];
  if (!meta.length) return [];
  const byId = new Map((data.all ?? []).map((p) => [p.id, p]));
  return sortHomeSections(
    meta.filter((s) => s.is_active !== false && s.show_on_home !== false),
  ).map((s) => {
      const fromIds = (s.resolved_product_ids ?? [])
        .map((id) => byId.get(id))
        .filter((p): p is Product => Boolean(p));
      const fromMap = data.sections?.[s.key] ?? [];
      return {
        ...s,
        products: fromIds.length > 0 ? fromIds : fromMap,
      };
    });
}

export function homeSectionDisplaySize(
  section: Pick<HomeOfferSectionDef, "key" | "layout">,
): "compact" | "default" | "featured" {
  if (section.layout === "countdown_rail" || section.layout === "budget_rail") return "featured";
  if (section.layout === "deal_card") return "default";
  if (section.key === "todays_deals" || section.key === "combo_packs" || section.key === "custom_offers") {
    return "compact";
  }
  return "default";
}

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
  { value: "categories", label: "Shop by category" },
  { value: "offers_strip", label: "Today's offers strip" },
  { value: "coupon_strip", label: "Coupons strip" },
  { value: "festive_banners", label: "Festival banner carousel" },
  { value: "shop_by_need", label: "Shop by need grid" },
  { value: "brands", label: "Featured brands" },
  { value: "recently_viewed", label: "Recently viewed" },
  { value: "service_promises", label: "Service promises" },
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
