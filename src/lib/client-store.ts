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
