import { createMiddleware } from "@tanstack/react-start";
import { ensureValidAccessToken } from "@/lib/auth-session";

/** Attaches a valid JWT access token to server function requests (refreshes when expired). */
export const attachAuthToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = await ensureValidAccessToken();
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
