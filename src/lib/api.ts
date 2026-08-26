import { Capacitor, CapacitorHttp } from "@capacitor/core";
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

function hostServesLocalApi(host: string) {
  if (isPrivateLanHost(host)) return true;
  if (host === "200.234.39.88") return true;
  if (host.endsWith("srimahalakshmistores.in")) return true;
  return false;
}

function resolveServerApiBase(): string {
  const configured = (process.env.API_URL || env.serverApiUrl || "").replace(/\/$/, "");
  if (configured && !configured.startsWith("/")) return configured;

  const vpsApi = env.vpsApiUrl.replace(/\/$/, "");
  if (vpsApi.startsWith("http")) return vpsApi;

  // Relative API path on the server — resolve against the Django backend origin.
  const apiPath = configured || env.apiUrl || "/api/v1";
  const origin = (process.env.VITE_API_PROXY_TARGET || env.apiProxyTarget || "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
  return `${origin}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`.replace(/\/$/, "");
}

const NATIVE_API_STORAGE_KEY = "mnxstore_native_api_url";

function readNativeApiOverride(): string {
  if (typeof window === "undefined") return "";

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("nativeApi") || params.get("apiBase");
    if (fromQuery?.startsWith("http")) {
      localStorage.setItem(NATIVE_API_STORAGE_KEY, fromQuery.replace(/\/$/, ""));
      return fromQuery.replace(/\/$/, "");
    }
  } catch {
    // ignore
  }

  try {
    const stored = localStorage.getItem(NATIVE_API_STORAGE_KEY);
    if (stored?.startsWith("http")) return stored.replace(/\/$/, "");
  } catch {
    // ignore
  }

  return "";
}

export function getApiBase() {
  // SSR and TanStack server functions run in Node — fetch() needs an absolute URL.
  if (typeof window === "undefined") {
    return resolveServerApiBase();
  }

  const nativeApi = readNativeApiOverride();
  if (nativeApi) return nativeApi;

  const base = (import.meta.env?.VITE_API_URL || env.apiUrl || "/api/v1").replace(/\/$/, "");
  const nativeApp = Capacitor.isNativePlatform();

  // Bundled Capacitor WebView is https://localhost — relative /api/v1 has no backend.
  if (nativeApp) {
    if (base.startsWith("http")) return base;
    const origin = (env.publicWebUrl || env.appUrl || "").replace(/\/$/, "");
    if (origin.startsWith("http")) {
      return `${origin}${base.startsWith("/") ? base : `/${base}`}`.replace(/\/$/, "");
    }
  }

  // Same-origin relative path — local dev / VPS web proxy /api/v1 to Django.
  if (base.startsWith("/")) {
    const host = window.location.hostname;
    if (hostServesLocalApi(host)) return base;
    const vpsApi = env.vpsApiUrl.replace(/\/$/, "");
    if (vpsApi.startsWith("http")) return vpsApi;
    return base;
  }

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

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function sendRequest(
  url: string,
  method: string,
  headers: Headers,
  body?: BodyInit | null,
): Promise<{ ok: boolean; status: number; text: string; contentType: string }> {
  const useBrowserFetch =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (Capacitor.isNativePlatform() && !useBrowserFetch) {
    let data: unknown;
    if (typeof body === "string" && body) {
      try {
        data = JSON.parse(body);
      } catch {
        data = body;
      }
    }
    const response = await CapacitorHttp.request({
      url,
      method: method || "GET",
      headers: headersToRecord(headers),
      data,
      connectTimeout: 20000,
      readTimeout: 20000,
    });
    const raw = response.data;
    const text =
      raw == null || raw === ""
        ? ""
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw);
    const contentType =
      response.headers?.["Content-Type"] ||
      response.headers?.["content-type"] ||
      (typeof raw === "object" && raw != null ? "application/json" : "text/plain");
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text,
      contentType,
    };
  }

  const res = await fetch(url, { method, headers, body: body ?? undefined });
  return {
    ok: res.ok,
    status: res.status,
    text: res.status === 204 ? "" : await res.text(),
    contentType: res.headers.get("content-type") ?? "",
  };
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
  let res: { ok: boolean; status: number; text: string; contentType: string };
  try {
    res = await sendRequest(url, rest.method ?? "GET", headers, rest.body);
  } catch {
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    throw new Error(
      offline
        ? "You're offline. Connect to the internet to load live data."
        : "Can't reach the store right now. Check your internet connection and try again.",
    );
  }

  if (res.status === 204) return undefined as T;

  const text = res.text;
  let data: unknown = null;
  if (text) {
    if (res.contentType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE")) {
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
