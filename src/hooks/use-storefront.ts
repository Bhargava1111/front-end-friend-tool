import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStorefrontMeta } from "@/lib/storefront.functions";
import { DEFAULT_SETTINGS, type CouponRow, type StoreSettings } from "@/lib/commerce";

export type StorefrontMeta = {
  settings: StoreSettings;
  brands: Array<{ id: string; name: string; slug: string; tagline: string | null; logo_url: string | null; banner_url: string | null }>;
  coupons: CouponRow[];
};

export function useStorefront() {
  const fetchMeta = useServerFn(getStorefrontMeta);
  const query = useQuery({
    queryKey: ["storefront-meta"],
    queryFn: () => fetchMeta() as Promise<StorefrontMeta>,
    staleTime: 5 * 60 * 1000,
  });
  return {
    ...query,
    settings: query.data?.settings ?? DEFAULT_SETTINGS,
    brands: query.data?.brands ?? [],
    coupons: query.data?.coupons ?? [],
  };
}
