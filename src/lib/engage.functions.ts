import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      productId: string;
      rating: number;
      title?: string;
      body?: string;
      authorName?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
    const { error } = await context.supabase.from("reviews").insert({
      product_id: data.productId,
      user_id: context.userId,
      rating,
      title: data.title?.slice(0, 120) ?? null,
      body: data.body?.slice(0, 2000) ?? null,
      author_name: data.authorName?.slice(0, 80) ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason: string; details?: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("order_returns").insert({
      order_id: data.orderId,
      user_id: context.userId,
      reason: data.reason.slice(0, 200),
      details: data.details?.slice(0, 2000) ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReturnsForOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("order_returns")
      .select("id, reason, details, status, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const reorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", data.orderId);

    let added = 0;
    let skipped = 0;
    for (const item of items ?? []) {
      if (!item.product_id) {
        skipped += 1;
        continue;
      }
      const { data: product } = await supabase
        .from("products")
        .select("id, stock, is_active")
        .eq("id", item.product_id)
        .maybeSingle();
      if (!product || !product.is_active || product.stock <= 0) {
        skipped += 1;
        continue;
      }
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", item.product_id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("cart_items")
          .insert({ user_id: userId, product_id: item.product_id, quantity: item.quantity });
      }
      added += 1;
    }
    return { added, skipped };
  });
