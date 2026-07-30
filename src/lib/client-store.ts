import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "./types";

type RecentlyViewedState = {
  items: Product[];
  add: (product: Product) => void;
  clear: () => void;
};

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) =>
        set((state) => ({
          items: [product, ...state.items.filter((p) => p.id !== product.id)].slice(0, 12),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "sms-recently-viewed",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type RecentSearchState = {
  terms: string[];
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
};

export const useRecentSearches = create<RecentSearchState>()(
  persist(
    (set) => ({
      terms: [],
      add: (term) =>
        set((state) => {
          const t = term.trim();
          if (t.length < 2) return state;
          return {
            terms: [t, ...state.terms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8),
          };
        }),
      remove: (term) => set((state) => ({ terms: state.terms.filter((t) => t !== term) })),
      clear: () => set({ terms: [] }),
    }),
    { name: "sms-recent-searches", storage: createJSONStorage(() => localStorage) },
  ),
);

export type DeliveryLocation = {
  label: string;
  detail: string;
  lat: number | null;
  lng: number | null;
  pincode?: string;
  source: "gps" | "address" | "manual" | "store";
};

type DeliveryLocationState = {
  location: DeliveryLocation | null;
  setLocation: (location: DeliveryLocation) => void;
  clear: () => void;
};

export const useDeliveryLocation = create<DeliveryLocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (location) => set({ location }),
      clear: () => set({ location: null }),
    }),
    { name: "sms-delivery-location", storage: createJSONStorage(() => localStorage) },
  ),
);

/* --------------------------- SAVE FOR LATER --------------------------- */

type SaveForLaterState = {
  items: Product[];
  save: (product: Product) => void;
  remove: (id: string) => void;
};

export const useSaveForLater = create<SaveForLaterState>()(
  persist(
    (set) => ({
      items: [],
      save: (product) =>
        set((state) => ({
          items: [product, ...state.items.filter((p) => p.id !== product.id)].slice(0, 40),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((p) => p.id !== id) })),
    }),
    { name: "sms-save-for-later", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ----------------------------- APPLIED COUPON ------------------------- */

type AppliedCouponState = {
  code: string | null;
  apply: (code: string) => void;
  clear: () => void;
};

export const useAppliedCoupon = create<AppliedCouponState>()(
  persist(
    (set) => ({
      code: null,
      apply: (code) => set({ code: code.toUpperCase() }),
      clear: () => set({ code: null }),
    }),
    { name: "sms-coupon", storage: createJSONStorage(() => localStorage) },
  ),
);

/* -------------------------- FAVOURITE CATEGORIES ---------------------- */

type FavouriteCategoryState = {
  slugs: string[];
  toggle: (slug: string) => void;
};

export const useFavouriteCategories = create<FavouriteCategoryState>()(
  persist(
    (set) => ({
      slugs: [],
      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        })),
    }),
    { name: "sms-favourite-categories", storage: createJSONStorage(() => localStorage) },
  ),
);

/* -------------------------------- LANGUAGE ---------------------------- */

type LanguageState = { code: string; setCode: (code: string) => void };

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({ code: "en", setCode: (code) => set({ code }) }),
    { name: "sms-language", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ------------------------------- APP UPDATE --------------------------- */

type AppUpdateState = { dismissedVersion: string | null; dismiss: (v: string) => void };

export const useAppUpdate = create<AppUpdateState>()(
  persist(
    (set) => ({ dismissedVersion: null, dismiss: (v) => set({ dismissedVersion: v }) }),
    { name: "sms-app-update", storage: createJSONStorage(() => localStorage) },
  ),
);

