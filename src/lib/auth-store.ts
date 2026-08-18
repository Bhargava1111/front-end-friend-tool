export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: string;
};

export type AuthSession = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export type JwtClaims = {
  sub?: string;
  user_id?: string;
  role?: string;
  exp?: number;
};

const ACCESS_KEY = "mnx_access";
const REFRESH_KEY = "mnx_refresh";
const USER_KEY = "mnx_user";
export const AUTH_CHANGED_EVENT = "mnx-auth-changed";
export const AUTH_CLEARED_EVENT = "mnx-auth-cleared";

function storage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64),
    ) as JwtClaims;
    return payload;
  } catch {
    return null;
  }
}

export function isAccessTokenValid(token: string | null | undefined, skewMs = 60_000): boolean {
  if (!token) return false;
  const claims = decodeJwtClaims(token);
  if (!claims) return false;
  if (!claims.exp) return true;
  return claims.exp * 1000 > Date.now() + skewMs;
}

export function getStoredSession(): AuthSession | null {
  const s = storage();
  if (!s) return null;
  const access = s.getItem(ACCESS_KEY);
  const refresh = s.getItem(REFRESH_KEY);
  const userRaw = s.getItem(USER_KEY);
  if (!access || !refresh || !userRaw) return null;
  try {
    return { access, refresh, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
}

export function hasStoredSession(): boolean {
  return !!getStoredSession();
}

export function hasValidSession(): boolean {
  const session = getStoredSession();
  return !!session && isAccessTokenValid(session.access);
}

export function saveSession(session: AuthSession) {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, session.access);
  s.setItem(REFRESH_KEY, session.refresh);
  s.setItem(USER_KEY, JSON.stringify(session.user));
  notifyAuthChanged();
}

export function clearSession() {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(USER_KEY);
}

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function notifyAuthCleared() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
}

export function getAccessToken(): string | null {
  const session = getStoredSession();
  if (!session) return null;
  return isAccessTokenValid(session.access) ? session.access : null;
}
