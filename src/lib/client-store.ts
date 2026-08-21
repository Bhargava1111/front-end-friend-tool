import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeLangCode } from "@/lib/i18n";
import { createSafeStorage } from "@/lib/safe-storage";
import type { Product } from "./types";

const persistStorage = createJSONStorage(() => createSafeStorage());

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
      storage: persistStorage,
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
    { name: "sms-recent-searches", storage: persistStorage },
  ),
);

export type DeliveryLocation = {
  label: string;
  detail: string;
  street?: string;
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
    {
      name: "sms-delivery-location",
      storage: persistStorage,
      version: 3,
      migrate: (persisted, version) => {
        if (version < 3) return { location: null };
        return persisted as DeliveryLocationState;
      },
    },
  ),
);

/* --------------------------- SAVE FOR LATER --------------------------- */

type SaveForLaterState = {
  items: Product[];
  save: (product: Product) => void;
  toggle: (product: Product) => void;
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
      toggle: (product) =>
        set((state) =>
          state.items.some((p) => p.id === product.id)
            ? { items: state.items.filter((p) => p.id !== product.id) }
            : { items: [product, ...state.items].slice(0, 40) },
        ),
      remove: (id) => set((state) => ({ items: state.items.filter((p) => p.id !== id) })),
    }),
    { name: "sms-save-for-later", storage: persistStorage },
  ),
);

/* ----------------------------- COMPARE LIST --------------------------- */

const MAX_COMPARE = 4;

type CompareListState = {
  items: Product[];
  add: (product: Product) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const useCompareList = create<CompareListState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product) => {
        const current = get().items;
        if (current.some((p) => p.id === product.id)) return true;
        if (current.length >= MAX_COMPARE) return false;
        set({ items: [...current, product] });
        return true;
      },
      remove: (id) => set((state) => ({ items: state.items.filter((p) => p.id !== id) })),
      clear: () => set({ items: [] }),
      has: (id) => get().items.some((p) => p.id === id),
    }),
    { name: "sms-compare-list", storage: persistStorage },
  ),
);

/* ----------------------------- NOTIFICATION PREFS --------------------- */

type NotificationPrefs = {
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  offersDeals: boolean;
  priceDrops: boolean;
  newArrivals: boolean;
  newsletter: boolean;
};

type NotificationPrefsState = NotificationPrefs & {
  set: (patch: Partial<NotificationPrefs>) => void;
};

export const useNotificationPrefs = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      orderUpdates: true,
      deliveryAlerts: true,
      offersDeals: true,
      priceDrops: true,
      newArrivals: false,
      newsletter: false,
      set: (patch) => set((state) => ({ ...state, ...patch })),
    }),
    { name: "sms-notification-prefs", storage: persistStorage },
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
    { name: "sms-coupon", storage: persistStorage },
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
    { name: "sms-favourite-categories", storage: persistStorage },
  ),
);

/* -------------------------------- LANGUAGE ---------------------------- */

type LanguageState = { code: string; setCode: (code: string) => void };

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      code: "en",
      setCode: (code) => set({ code: normalizeLangCode(code) }),
    }),
    {
      name: "sms-language",
      storage: persistStorage,
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { code?: string };
        return { code: normalizeLangCode(state?.code) };
      },
    },
  ),
);

/* ------------------------------- APP UPDATE --------------------------- */

type AppUpdateState = { dismissedVersion: string | null; dismiss: (v: string) => void };

export const useAppUpdate = create<AppUpdateState>()(
  persist(
    (set) => ({ dismissedVersion: null, dismiss: (v) => set({ dismissedVersion: v }) }),
    { name: "sms-app-update", storage: persistStorage },
  ),
);

