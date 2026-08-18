import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { decodeJwtClaims, isAccessTokenValid } from "@/lib/auth-store";

export type AuthContext = {
  userId: string;
  role: string;
  accessToken: string;
};

export type OptionalAuthContext = {
  userId?: string;
  role?: string;
  accessToken?: string;
};

export const optionalAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader =
    request?.headers?.get("authorization") ?? request?.headers?.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return next({ context: {} satisfies OptionalAuthContext });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || !isAccessTokenValid(token, 0)) {
    return next({ context: {} satisfies OptionalAuthContext });
  }

  const claims = decodeJwtClaims(token);
  const userId = claims?.user_id || claims?.sub;

  return next({
    context: {
      userId: userId ? String(userId) : undefined,
      role: claims?.role ? String(claims.role) : undefined,
      accessToken: token,
    } satisfies OptionalAuthContext,
  });
});

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader =
    request?.headers?.get("authorization") ?? request?.headers?.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No authorization header provided");
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  if (!isAccessTokenValid(token, 0)) {
    throw new Error("Session expired. Please sign in again.");
  }

  const claims = decodeJwtClaims(token);
  const userId = claims?.user_id || claims?.sub;
  if (!userId) {
    throw new Error("Unauthorized: Invalid token");
  }

  return next({
    context: {
      userId: String(userId),
      role: String(claims?.role ?? "customer"),
      accessToken: token,
    } satisfies AuthContext,
  });
});
