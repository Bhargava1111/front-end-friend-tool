import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCart, getWishlist } from "@/lib/shop.functions";
import type { CartLine, Product } from "@/lib/types";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useCart() {
  const { session } = useSession();
  const fetchCart = useServerFn(getCart);
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart() as Promise<CartLine[]>,
    enabled: !!session,
  });
}

export function useCartCount() {
  const { data } = useCart();
  return (data ?? []).reduce((sum, line) => sum + line.quantity, 0);
}

export function useWishlist() {
  const { session } = useSession();
  const fetchWishlist = useServerFn(getWishlist);
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => fetchWishlist() as Promise<{ id: string; product: Product }[]>,
    enabled: !!session,
  });
}

export function useInvalidateShop() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };
}

export { useMutation };
