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

/** Server functions on web; direct Django admin API on Capacitor. */
export function useAdminFn<SF extends AnyFn, CF extends AnyFn>(serverFn: SF, clientFn: CF): CF {
  return useNativeFn(serverFn, clientFn);
}
