import { env } from "@/lib/env";

function isPrivateLanHost(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export type ApiError = {
  detail?: string | string[] | { detail?: string; code?: string };
  ok?: boolean;
  message?: string;
  fields?: Record<string, string[]>;
};

function extractApiError(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `Request failed (${status})`;
  const obj = data as ApiError;
  const detail = obj.detail ?? obj.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  if (detail && typeof detail === "object" && "detail" in detail) {
    const nested = (detail as { detail?: unknown }).detail;
    if (typeof nested === "string") return nested;
  }
  return `Request failed (${status})`;
}

function resolveServerApiBase(): string {
  const configured = (process.env.API_URL || env.serverApiUrl || "").replace(/\/$/, "");
  if (configured && !configured.startsWith("/")) return configured;

  // Relative API path on the server — resolve against the Django backend origin.
  const apiPath = configured || env.apiUrl || "/api/v1";
  const origin = (process.env.VITE_API_PROXY_TARGET || env.apiProxyTarget || "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
  return `${origin}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`.replace(/\/$/, "");
}

export function getApiBase() {
  // SSR and TanStack server functions run in Node — fetch() needs an absolute URL.
  if (typeof window === "undefined") {
    return resolveServerApiBase();
  }

  const base = (import.meta.env?.VITE_API_URL || env.apiUrl || "/api/v1").replace(/\/$/, "");

  // Same-origin relative path — works in browser and Capacitor WebView (Vite /api/v1 proxy).
  if (base.startsWith("/")) return base;

  const host = window.location.hostname;

  // Local / LAN dev (desktop browser or phone on Wi‑Fi hitting your PC).
  if (isPrivateLanHost(host)) {
    try {
      const configured = new URL(base, window.location.origin);
      if (configured.origin === window.location.origin) {
        return configured.pathname.replace(/\/$/, "") || "/api/v1";
      }
    } catch {
      // fall through
    }
    if (env.apiUrl.startsWith("/")) return env.apiUrl;
    return "/api/v1";
  }

  try {
    const configured = new URL(base, window.location.origin);
    if (configured.origin === window.location.origin) {
      return configured.pathname.replace(/\/$/, "") || "/api/v1";
    }
  } catch {
    // keep absolute URL
  }

  return base;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options;
  const headers = new Headers(extraHeaders);
  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http") ? path : `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE")) {
      throw new Error(
        res.status >= 500
          ? "Server error. Please try again in a moment."
          : `Request failed (${res.status})`,
      );
    }
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const message = extractApiError(data, res.status);
    if (res.status === 401) {
      throw new Error(
        message.toLowerCase().includes("token")
          ? "Session expired. Please sign in again."
          : message,
      );
    }
    throw new Error(message);
  }

  return data as T;
}

export function toJsonBody(data: unknown): string {
  return JSON.stringify(data);
}
