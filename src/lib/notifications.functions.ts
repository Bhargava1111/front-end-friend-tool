import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { ensureValidAccessToken } from "@/lib/auth-session";
import { apiFetch, toJsonBody } from "@/lib/api";

async function requireAccessToken() {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Please sign in to continue.");
  return token;
}

/** Direct Django API — use in Capacitor / bundled APK (no server functions). */
export async function fetchNotificationsClient(): Promise<AppNotification[]> {
  const token = await requireAccessToken();
  return apiFetch<AppNotification[]>("/notifications/", { token });
}

export async function markNotificationsReadClient(data: { id?: string }) {
  const token = await requireAccessToken();
  if (data.id) {
    await apiFetch(`/notifications/${data.id}/read/`, { method: "POST", token });
  } else {
    await apiFetch("/notifications/read-all/", { method: "POST", token });
  }
  return { ok: true };
}

export async function clearNotificationsClient() {
  const token = await requireAccessToken();
  const items = await apiFetch<AppNotification[]>("/notifications/", { token });
  for (const n of items) {
    await apiFetch(`/notifications/${n.id}/`, { method: "DELETE", token });
  }
  return { ok: true };
}

export type AppNotification = {
  id: string;
  title: string;
  body: string | null;
  image_url?: string | null;
  type: string;
  order_id: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch<AppNotification[]>("/notifications/", { token: context.accessToken });
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id?: string }) => data)
  .handler(async ({ data, context }) => {
    if (data.id) {
      await apiFetch(`/notifications/${data.id}/read/`, {
        method: "POST",
        token: context.accessToken,
      });
    } else {
      await apiFetch("/notifications/read-all/", {
        method: "POST",
        token: context.accessToken,
      });
    }
    return { ok: true };
  });

export const clearNotifications = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const items = await apiFetch<AppNotification[]>("/notifications/", { token: context.accessToken });
    for (const n of items) {
      await apiFetch(`/notifications/${n.id}/`, {
        method: "DELETE",
        token: context.accessToken,
      });
    }
    return { ok: true };
  });
