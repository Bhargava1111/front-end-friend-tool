import { apiFetch, toJsonBody } from "@/lib/api";
import { ensureValidAccessToken } from "@/lib/auth-session";

const SESSION_KEY = "sms-analytics-session";
const LAST_SEARCH_KEY = "sms-last-search";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export function analyticsHeaders(): Record<string, string> {
  const id = getAnalyticsSessionId();
  return id ? { "X-Analytics-Session": id } : {};
}

export type LastSearch = { id: string; query: string };

export function setLastSearch(search: LastSearch | null) {
  if (typeof window === "undefined") return;
  try {
    if (!search) sessionStorage.removeItem(LAST_SEARCH_KEY);
    else sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(search));
  } catch {
    /* ignore */
  }
}

export function getLastSearch(): LastSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSearch;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function trackPost(path: string, body: Record<string, unknown>) {
  if (typeof window === "undefined") return null;
  try {
    const token = await ensureValidAccessToken();
    return await apiFetch<{ ok: boolean; id?: string; recorded?: boolean }>(path, {
      method: "POST",
      token,
      headers: analyticsHeaders(),
      body: toJsonBody({ ...body, session_id: getAnalyticsSessionId() }),
    });
  } catch {
    return null;
  }
}

export async function trackSearch(payload: {
  query: string;
  resultsCount: number;
  filters?: Record<string, unknown>;
}) {
  const res = await trackPost("/analytics/search/", {
    query: payload.query,
    results_count: payload.resultsCount,
    filters: payload.filters ?? {},
  });
  if (res?.id) setLastSearch({ id: res.id, query: payload.query });
  return res;
}

export async function trackProductView(payload: {
  productId: string;
  source?: string;
  referrer?: string;
}) {
  const last = getLastSearch();
  return trackPost("/analytics/view/", {
    product_id: payload.productId,
    search_id: last?.id,
    source: payload.source || (last ? "search" : "direct"),
    referrer: payload.referrer || (typeof document !== "undefined" ? document.referrer : ""),
  });
}

export async function trackJourney(payload: {
  eventType: "click" | "add_to_cart" | "checkout" | "purchase";
  productId?: string;
}) {
  if (payload.eventType === "checkout" && typeof window !== "undefined") {
    const key = "sms-checkout-tracked";
    try {
      if (sessionStorage.getItem(key)) return null;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }
  const last = getLastSearch();
  return trackPost("/analytics/journey/", {
    event_type: payload.eventType,
    product_id: payload.productId,
    search_id: last?.id,
  });
}
