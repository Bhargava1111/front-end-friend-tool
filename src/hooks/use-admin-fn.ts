import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { isNativePlatform } from "@/lib/capacitor";

type AnyFn = (...args: never[]) => Promise<unknown>;

/** Server functions on web; direct Django API on Capacitor (no Start server). */
export function useNativeFn<SF extends AnyFn, CF extends AnyFn>(serverFn: SF, clientFn: CF): CF {
  const server = useServerFn(serverFn as Parameters<typeof useServerFn>[0]);
  return useCallback(
    (...args: Parameters<CF>) =>
      isNativePlatform() ? clientFn(...args) : (server as CF)(...args),
    [server, clientFn],
  ) as CF;
}

/**
 * Admin calls go straight to Django from the browser.
 * Routing them through TanStack server functions added a slow extra hop and
 * turned API errors into a generic HTML 500 ("Server error").
 */
export function useAdminFn<SF extends AnyFn, CF extends AnyFn>(serverFn: SF, clientFn: CF): CF {
  const server = useServerFn(serverFn as Parameters<typeof useServerFn>[0]);
  return useCallback(
    (...args: Parameters<CF>) =>
      typeof window !== "undefined" ? clientFn(...args) : (server as CF)(...args),
    [server, clientFn],
  ) as CF;
}
