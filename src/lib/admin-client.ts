import { ensureValidAccessToken } from "@/lib/auth-session";
import { adminFetch } from "@/lib/admin-api";

export async function requireAccessToken() {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Please sign in to continue.");
  return token;
}

/** Direct Django admin API — use in Capacitor / bundled APK (no server functions). */
export async function adminClient(path: string, init?: RequestInit) {
  const token = await requireAccessToken();
  return adminFetch(token, path, init);
}
