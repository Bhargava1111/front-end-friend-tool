import { Capacitor } from "@capacitor/core";

export type DeviceCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

function isInsecureMobileBrowser() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  return window.location.protocol === "http:" && !isLocal;
}

export function canUseBrowserGps(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;
  return !isInsecureMobileBrowser();
}

export function locationErrorMessage(err?: GeolocationPositionError) {
  if (Capacitor.isNativePlatform()) {
    return "Couldn't get your location. Open phone Settings → Apps → Sri Mahalakshmi Stores → Permissions → Location → Allow.";
  }
  if (isInsecureMobileBrowser()) {
    return "GPS isn't available in the mobile browser on HTTP. Enter your pincode and tap the map to place your pin, or use the Android app.";
  }
  if (err?.code === 1) {
    return "Location permission denied. Allow location access in your browser or phone settings.";
  }
  return "Couldn't get your location. Enable GPS and try again.";
}

/** Device GPS — prefers a high-accuracy fix (street / door-level) like delivery apps. */
export async function getDeviceCoords(): Promise<DeviceCoords> {
  const first = await readOnce();
  if (first.accuracy && first.accuracy <= 25) return first;

  const improved = await waitForBetterFix(first);
  return improved ?? first;
}

async function readOnce(): Promise<DeviceCoords> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      perm = await Geolocation.requestPermissions();
    }
    if (perm.location !== "granted") {
      throw new Error(locationErrorMessage());
    }
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      throw new Error(locationErrorMessage());
    }
  }

  return new Promise((resolve, reject) => {
    if (!canUseBrowserGps()) {
      reject(new Error(locationErrorMessage()));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(locationErrorMessage(err))),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

async function waitForBetterFix(seed: DeviceCoords): Promise<DeviceCoords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    let best = seed;
    const done = (value: DeviceCoords | null) => {
      clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      resolve(value);
    };
    const timer = setTimeout(() => done(best.accuracy && best.accuracy < (seed.accuracy ?? 999) ? best : seed), 8000);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best.accuracy || (next.accuracy && next.accuracy < best.accuracy)) {
          best = next;
        }
        if (next.accuracy && next.accuracy <= 20) done(next);
      },
      () => done(best),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}
