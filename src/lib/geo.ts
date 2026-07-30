export type LatLng = { lat: number; lng: number };

export type StoreLocation = {
  id: string;
  name: string;
  address_text: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  opening_hours: string;
  delivery_radius_km: number;
  is_active: boolean;
};

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function nearestStore<T extends LatLng>(point: LatLng, stores: T[]) {
  if (stores.length === 0) return null;
  return stores
    .map((store) => ({ store, km: distanceKm(point, store) }))
    .sort((a, b) => a.km - b.km)[0];
}

/** Rough ETA used for the delivery promise strip. */
export function etaMinutes(km: number) {
  return Math.max(12, Math.round(10 + km * 4));
}

/** Project a set of coordinates into 0-100 % positions for the fallback map. */
export function projectPoints(points: LatLng[], padding = 12) {
  if (points.length === 0) return [] as Array<{ x: number; y: number }>;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);
  const usable = 100 - padding * 2;
  return points.map((p) => ({
    x: padding + ((p.lng - minLng) / spanLng) * usable,
    y: padding + ((maxLat - p.lat) / spanLat) * usable,
  }));
}

export const DEFAULT_CENTER: LatLng = { lat: 13.0418, lng: 80.2341 };
