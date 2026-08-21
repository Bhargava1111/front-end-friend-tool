import type { OfferSectionKey, OfferSectionsMap } from "@/lib/offer-sections";
import type { Product } from "@/lib/types";

export type DealsTab =
  | "all"
  | "flash"
  | "today"
  | "budget"
  | "festive"
  | "combo"
  | "best_sellers"
  | "trending"
  | "recommended"
  | "newest";

export const DEALS_TAB_TO_SECTION: Partial<Record<DealsTab, OfferSectionKey>> = {
  flash: "flash_sale",
  today: "todays_deals",
  budget: "under_99",
  festive: "festive_picks",
  combo: "combo_packs",
};

export type HomeCatalogData = {
  all?: Product[];
  newest?: Product[];
  featured?: Product[];
  bestSelling?: Product[];
  recommended?: Product[];
  sections?: OfferSectionsMap;
};

function discountPct(p: Product) {
  if (!p.mrp || Number(p.mrp) <= Number(p.price)) return 0;
  return Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100);
}

function allProducts(home: HomeCatalogData): Product[] {
  return Array.from(
    new Map(
      [
        ...(home.all ?? []),
        ...(home.newest ?? []),
        ...(home.featured ?? []),
        ...(home.bestSelling ?? []),
        ...(home.recommended ?? []),
      ].map((p) => [p.id, p]),
    ).values(),
  );
}

function discountedProducts(home: HomeCatalogData, limit = 40): Product[] {
  return allProducts(home)
    .filter((p) => discountPct(p) > 0)
    .sort((a, b) => discountPct(b) - discountPct(a))
    .slice(0, limit);
}

/** Resolve products for a home offer section — mirrors rail logic on the storefront. */
export function resolveSectionProducts(
  section: OfferSectionKey,
  home: HomeCatalogData,
  opts?: { categoryId?: string; limit?: number },
): Product[] {
  const limit = opts?.limit ?? 40;
  const sections = home.sections ?? {};
  const curated = sections[section];
  if (curated?.length) return curated.slice(0, limit);

  const pool = allProducts(home);

  switch (section) {
    case "flash_sale":
      return discountedProducts(home, limit);
    case "todays_deals":
      return (home.featured?.length ? home.featured : pool.filter((p) => p.is_featured)).slice(0, limit);
    case "under_99":
      return pool.filter((p) => Number(p.price) <= 99).slice(0, limit);
    case "festive_picks":
      if (opts?.categoryId) {
        return pool.filter((p) => p.category_id === opts.categoryId).slice(0, limit);
      }
      return pool.slice(0, limit);
    case "combo_packs":
      return pool.filter((p) => p.is_combo).slice(0, limit);
    case "custom_offers":
      return discountedProducts(home, limit);
    default:
      return pool.slice(0, limit);
  }
}

/** Resolve products for a /deals tab — same rules as home rails. */
export function resolveDealsTabProducts(tab: DealsTab, home: HomeCatalogData): Product[] {
  if (tab === "all") return discountedProducts(home, 40);

  const section = DEALS_TAB_TO_SECTION[tab];
  if (section) return resolveSectionProducts(section, home);

  switch (tab) {
    case "best_sellers":
      return (home.bestSelling?.length ? home.bestSelling : allProducts(home).filter((p) => p.is_best_seller)).slice(
        0,
        40,
      );
    case "trending": {
      const trending = home.bestSelling?.length ? home.bestSelling : home.newest;
      return (trending ?? []).slice(0, 40);
    }
    case "recommended":
      return (home.recommended?.length ? home.recommended : allProducts(home).filter((p) => p.is_recommended)).slice(
        0,
        40,
      );
    case "newest":
      return (home.newest?.length ? home.newest : allProducts(home)).slice(0, 40);
    default:
      return discountedProducts(home, 40);
  }
}

export function dealsTabLabel(tab: DealsTab): string {
  const labels: Record<DealsTab, string> = {
    all: "All deals",
    flash: "Flash sale",
    today: "Today's deals",
    budget: "Under ₹99",
    festive: "Festive picks",
    combo: "Combo packs",
    best_sellers: "Best sellers",
    trending: "Trending now",
    recommended: "Recommended",
    newest: "Newly added",
  };
  return labels[tab] ?? tab;
}
