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

export function nearestStore<T extends { latitude: number; longitude: number }>(
  point: LatLng,
  stores: T[],
) {
  if (stores.length === 0) return null;
  return stores
    .map((store) => ({
      store,
      km: distanceKm(point, { lat: store.latitude, lng: store.longitude }),
    }))
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

import { getApiBase } from "@/lib/api";
import { env } from "@/lib/env";
import { getDeviceCoords } from "@/lib/device-location";

export const DEFAULT_CENTER: LatLng = { lat: 13.0418, lng: 80.2341 };

type ReverseGeocodeResponse = {
  label: string;
  detail: string;
  street?: string | null;
  suburb?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  line1?: string;
  line2?: string | null;
  landmark?: string | null;
  latitude?: number;
  longitude?: number;
};

export type ParsedAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  fullAddress?: string;
};

async function reverseGeocodeBigDataCloud(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
  const res = await fetch(
    `${env.geoReverseUrl}?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
  );
  if (!res.ok) throw new Error("reverse geocode failed");
  const data = await res.json();
  const admin = data.localityInfo?.administrative ?? [];
  const suburb = [...admin].reverse().find((a: { order: number }) => a.order >= 8)?.name;
  const city = data.city || data.locality;
  const label =
    suburb && city && suburb !== city
      ? `${suburb}, ${city}`
      : city || data.principalSubdivision || "Current location";
  const detail = [suburb, city, data.principalSubdivision, data.postcode]
    .filter((part: string, i: number, arr: string[]) => part && arr.indexOf(part) === i)
    .join(" · ");
  return {
    label,
    detail: detail || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    suburb,
    city,
    pincode: data.postcode || undefined,
  };
}

function formatFullAddress(place: ReverseGeocodeResponse, lat: number, lng: number) {
  const parts = [
    place.line1,
    place.street && place.street !== place.line1 ? place.street : "",
    place.line2,
    place.suburb,
    place.city,
    place.state,
    place.pincode,
  ].filter((part, index, arr) => {
    const value = (part || "").trim();
    if (!value) return false;
    return arr.findIndex((other) => (other || "").trim().toLowerCase() === value.toLowerCase()) === index;
  });
  if (place.label && place.label.split(",").length >= 3) {
    return place.label;
  }
  return parts.join(", ") || place.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Resolve GPS coordinates to saved-address form fields. */
export async function addressFromCoords(lat: number, lng: number): Promise<ParsedAddress> {
  try {
    const res = await fetch(
      `${getApiBase()}/geocode/reverse/?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as ReverseGeocodeResponse;
      return {
        line1: data.line1 || data.street || data.suburb || data.label.split(",")[0] || "",
        line2: data.line2 || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
        landmark: data.landmark || undefined,
        latitude: data.latitude ?? lat,
        longitude: data.longitude ?? lng,
        fullAddress: formatFullAddress(data, lat, lng),
      };
    }
  } catch {
    // fall through
  }

  const place = await reverseGeocodeLabel(lat, lng);
  return {
    line1: place.street || place.label.split(",")[0] || "",
    line2: "",
    city: "",
    state: "",
    pincode: place.pincode || "",
    latitude: lat,
    longitude: lng,
    fullAddress: [place.street, place.label, place.detail].filter(Boolean).join(", "),
  };
}

/** Read device GPS and return address form fields. */
export async function detectCurrentAddress() {
  const coords = await getDeviceCoords();
  return addressFromCoords(coords.latitude, coords.longitude);
}

/** Resolve GPS coordinates to a human-readable street + area name. */
export async function reverseGeocodeLabel(lat: number, lng: number) {
  try {
    const res = await fetch(
      `${getApiBase()}/geocode/reverse/?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as ReverseGeocodeResponse;
      return {
        label: data.label,
        detail: data.detail || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        pincode: data.pincode || undefined,
        street: data.street || undefined,
      };
    }
  } catch {
    // fall through to backup provider
  }

  try {
    return await reverseGeocodeBigDataCloud(lat, lng);
  } catch {
    return {
      label: "Current location",
      detail: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  }
}

export async function locationFromCoords(
  coords: LatLng,
  stores: Array<{ latitude: number; longitude: number; name: string }>,
  accuracyM?: number,
) {
  const place = await reverseGeocodeLabel(coords.lat, coords.lng);
  const closest = nearestStore(coords, stores);
  const accuracy = accuracyM ? ` · ±${Math.round(accuracyM)} m` : "";
  const storeNote = closest
    ? `${formatKm(closest.km)} from ${closest.store.name.split("—").pop()?.trim() ?? closest.store.name}`
    : null;
  return {
    label: place.label,
    detail: storeNote ? `${place.detail}${accuracy} · ${storeNote}` : `${place.detail}${accuracy}`,
    street: place.street,
    lat: coords.lat,
    lng: coords.lng,
    pincode: place.pincode,
    source: "gps" as const,
  };
}
