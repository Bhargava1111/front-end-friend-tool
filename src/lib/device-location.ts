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

export function locationErrorMessage(err?: GeolocationPositionError) {
  if (Capacitor.isNativePlatform()) {
    return "Couldn't get your location. Open phone Settings → Apps → Sri Mahalakshmi Stores → Permissions → Location → Allow.";
  }
  if (isInsecureMobileBrowser()) {
    return "GPS is blocked in the mobile browser over HTTP. Enter your address manually, use pincode, or install the Android app.";
  }
  if (err?.code === 1) {
    return "Location permission denied. Allow location access in your browser or phone settings.";
  }
  return "Couldn't get your location. Enable GPS and try again.";
}

/** Device GPS — uses Capacitor on native apps, browser API elsewhere. */
export async function getDeviceCoords(): Promise<DeviceCoords> {
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
