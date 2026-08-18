import { createMiddleware } from "@tanstack/react-start";
import { getAdminPanelToken } from "@/lib/admin-session";

/** Forwards the admin panel step-up session token to server functions. */
export const attachAdminSession = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = getAdminPanelToken();
  return next({
    headers: token ? { "X-Admin-Session": token } : {},
  });
});
