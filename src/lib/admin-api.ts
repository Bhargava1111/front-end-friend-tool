import { getRequest } from "@tanstack/react-start/server";
import { apiFetch } from "@/lib/api";

export function adminPanelHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const request = getRequest();
  const session =
    request?.headers?.get("x-admin-session") ?? request?.headers?.get("X-Admin-Session");
  if (session) headers.set("X-Admin-Session", session);
  return headers;
}

export function adminFetch<T>(token: string, path: string, init?: RequestInit) {
  return apiFetch<T>(path, { ...init, token, headers: adminPanelHeaders(init) });
}
