export const ADMIN_PANEL_SESSION_KEY = "mnx_admin_panel_session";

export function getAdminPanelToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_PANEL_SESSION_KEY) || localStorage.getItem(ADMIN_PANEL_SESSION_KEY);
}

export function saveAdminPanelToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_PANEL_SESSION_KEY, token);
  localStorage.setItem(ADMIN_PANEL_SESSION_KEY, token);
}

export function clearAdminPanelToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_PANEL_SESSION_KEY);
  localStorage.removeItem(ADMIN_PANEL_SESSION_KEY);
}

export function isAdminSessionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("admin otp") ||
    m.includes("admin session") ||
    m.includes("admin panel") ||
    m.includes("permission denied") ||
    m.includes("forbidden")
  );
}

/** Default idle timeout — matches backend ADMIN_PANEL_IDLE_SECONDS (10 min). */
export const ADMIN_PANEL_IDLE_MS = 10 * 60 * 1000;
