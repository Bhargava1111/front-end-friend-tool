import { getApiBase } from "@/lib/api";
import { ensureValidAccessToken } from "@/lib/auth-session";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBase()}/app/config/`);
    if (!res.ok) return null;
    const data = (await res.json()) as { vapid_public_key?: string };
    return data.vapid_public_key || null;
  } catch {
    return null;
  }
}

export type PushSubscribeResult =
  | "granted"
  | "denied"
  | "unsupported"
  | "skipped"
  | "no_session"
  | "no_vapid"
  | "subscribe_failed"
  | "save_failed"
  | "error";

/** Register service worker and subscribe this browser to push notifications. */
export async function subscribeToPushNotifications(
  options: { requestPermission?: boolean } = {},
): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }

  const token = await ensureValidAccessToken();
  if (!token) return "no_session";

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) return "no_vapid";

  let permission = Notification.permission;
  if (permission === "default" && options.requestPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission === "denied" ? "denied" : "skipped";

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    // Re-subscribe when VAPID key changes or subscription is stale.
    if (subscription) {
      try {
        const json = subscription.toJSON();
        const res = await fetch(`${getApiBase()}/push/subscribe/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        if (res.ok) return "granted";
      } catch {
        // fall through to fresh subscribe
      }
      await subscription.unsubscribe().catch(() => undefined);
      subscription = null;
    }

    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } catch {
      return "subscribe_failed";
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return "subscribe_failed";
    }

    const res = await fetch(`${getApiBase()}/push/subscribe/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    if (!res.ok) return "save_failed";
    return "granted";
  } catch {
    return "error";
  }
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushSubscribeErrorMessage(result: PushSubscribeResult): string {
  switch (result) {
    case "denied":
      return "Notifications blocked in browser settings";
    case "unsupported":
      return "Push is not supported on this device";
    case "no_session":
      return "Please sign in again to enable push notifications";
    case "no_vapid":
      return "Push is not configured on the server. Restart the backend after setting VAPID keys.";
    case "subscribe_failed":
      return "Browser could not subscribe to push. Try clearing site data and retry.";
    case "save_failed":
      return "Could not save push subscription. Check that the API server is running.";
    case "skipped":
      return "Allow notifications when prompted, then try again";
    default:
      return "Could not enable push notifications";
  }
}
