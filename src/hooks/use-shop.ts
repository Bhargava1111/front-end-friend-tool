import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getCart, getWishlist } from "@/lib/shop.functions";
import type { CartLine, Product } from "@/lib/types";
import { ensureValidAccessToken, isAuthError } from "@/lib/auth-session";
import {
  AUTH_CHANGED_EVENT,
  AUTH_CLEARED_EVENT,
  clearSession,
  getStoredSession,
  hasValidSession,
  notifyAuthCleared,
  saveSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth-store";

export function useSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = getStoredSession();
      if (!stored) {
        setSession(null);
        setLoading(false);
        return;
      }
      const token = await ensureValidAccessToken();
      setSession(token ? getStoredSession() : null);
      if (!token) clearSession();
      setLoading(false);
    })();

    const sync = () => setSession(getStoredSession());
    const onCleared = () => setSession(null);

    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signIn = useCallback((s: AuthSession) => {
    saveSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    notifyAuthCleared();
    setSession(null);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signOut,
  };
}

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart() as Promise<CartLine[]>,
    enabled: hasValidSession(),
    retry: (count, error) =>
      !(error instanceof Error && isAuthError(error.message)) && count < 1,
  });
}

export function useCartCount() {
  const { data } = useCart();
  return (data ?? []).reduce((sum, line) => sum + line.quantity, 0);
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getWishlist() as Promise<{ id: string; product: Product }[]>,
    enabled: hasValidSession(),
    retry: (count, error) =>
      !(error instanceof Error && isAuthError(error.message)) && count < 1,
  });
}

export function useInvalidateShop() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };
}

export type { AuthUser, AuthSession };
export { useMutation };
