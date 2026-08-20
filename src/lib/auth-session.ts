import { apiFetch, toJsonBody } from "@/lib/api";
import {
  clearSession,
  getStoredSession,
  isAccessTokenValid,
  notifyAuthCleared,
  saveSession,
  type AuthSession,
} from "@/lib/auth-store";

let refreshPromise: Promise<string | null> | null = null;
let authFailureNotified = false;

/** Returns a valid access token, refreshing silently when possible. */
export async function ensureValidAccessToken(): Promise<string | null> {
  const session = getStoredSession();
  if (!session) return null;

  if (isAccessTokenValid(session.access)) {
    return session.access;
  }

  if (!session.refresh) {
    reportAuthFailure();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenClient(session.refresh).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function refreshAccessTokenClient(refresh: string): Promise<string | null> {
  const session = getStoredSession();
  try {
    const data = await apiFetch<{ access: string; refresh?: string }>("/auth/refresh/", {
      method: "POST",
      body: toJsonBody({ refresh }),
    });

    if (!data.access) {
      reportAuthFailure();
      return null;
    }

    const current = getStoredSession();
    if (!current) return null;

    const next: AuthSession = {
      ...current,
      access: data.access,
      refresh: data.refresh || current.refresh,
    };
    saveSession(next);
    return data.access;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isAuthError(message)) {
      reportAuthFailure();
      return null;
    }
    // Network / API outage — keep the existing session instead of forcing login.
    return session?.access ?? null;
  }
}

export function reportAuthFailure() {
  clearSession();
  notifyAuthCleared();
}

export function isAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("token not valid") ||
    m.includes("token is invalid") ||
    m.includes("token has expired") ||
    m.includes("invalid token") ||
    m.includes("invalid refresh") ||
    m.includes("session expired")
  );
}

/** User-friendly auth error for toasts; clears stale session once. */
export function formatAuthError(message: string): string | null {
  if (!isAuthError(message)) return null;
  if (!authFailureNotified) {
    authFailureNotified = true;
    reportAuthFailure();
    setTimeout(() => {
      authFailureNotified = false;
    }, 3000);
  }
  return "Your session expired. Please sign in again.";
}

export function formatShopError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return formatAuthError(message) ?? message;
}
