const PREFIX = "mnx_offline_";

export function writeOfflineCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    // quota / private mode
  }
}

export function readOfflineCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: T };
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function isOfflineNow() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function offlineMessage(fallback?: string) {
  if (isOfflineNow()) {
    return "You're offline. Connect to the internet to refresh, or keep browsing saved store data.";
  }
  return fallback || "Can't reach the store right now. Check your connection and try again.";
}
