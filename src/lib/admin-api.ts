import { apiFetch } from "@/lib/api";
import { getAdminPanelToken } from "@/lib/admin-session";

export function adminPanelHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    const token = getAdminPanelToken();
    if (token) headers.set("X-Admin-Session", token);
  }
  return headers;
}

export function adminFetch<T>(token: string, path: string, init?: RequestInit) {
  return apiFetch<T>(path, { ...init, token, headers: adminPanelHeaders(init) });
}
