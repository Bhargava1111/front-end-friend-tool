import { useQuery } from "@tanstack/react-query";
import { reverseGeocodeLabel } from "@/lib/geo";

/** Resolve GPS coordinates to a street / area label for admin review screens. */
export function useReverseGeocode(lat?: number | null, lng?: number | null) {
  return useQuery({
    queryKey: ["reverse-geocode", lat, lng],
    queryFn: () => reverseGeocodeLabel(lat!, lng!),
    enabled: lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: 10 * 60 * 1000,
  });
}
