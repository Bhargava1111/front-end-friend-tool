export const OFFER_SECTIONS = [
  { key: "flash_sale", label: "Flash sale" },
  { key: "todays_deals", label: "Today's deals" },
  { key: "under_99", label: "Under ₹99" },
  { key: "festive_picks", label: "Festive picks" },
  { key: "combo_packs", label: "Combo packs" },
  { key: "custom_offers", label: "Custom offers" },
] as const;

export type OfferSectionKey = (typeof OFFER_SECTIONS)[number]["key"];

export function offerSectionLabel(key: string) {
  return OFFER_SECTIONS.find((s) => s.key === key)?.label ?? key;
}

export type OfferSectionsMap = Partial<Record<OfferSectionKey, import("@/lib/types").Product[]>>;
