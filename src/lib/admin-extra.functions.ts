import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* -------------------------------- BRANDS ------------------------------- */

export const adminListBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, slug, tagline, logo_url, sort_order, is_active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      slug: string;
      tagline?: string;
      logo_url?: string;
      sort_order: number;
      is_active: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const payload = {
      ...fields,
      tagline: fields.tagline || null,
      logo_url: fields.logo_url || null,
    };
    const { error } = id
      ? await context.supabase.from("brands").update(payload).eq("id", id)
      : await context.supabase.from("brands").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- COUPONS ------------------------------- */

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("coupons")
      .select(
        "id, code, title, description, discount_type, discount_value, min_order, max_discount, usage_limit, used_count, is_active, ends_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      code: string;
      title: string;
      description?: string;
      discount_type: string;
      discount_value: number;
      min_order: number;
      max_discount?: number | null;
      usage_limit?: number | null;
      is_active: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const payload = {
      ...fields,
      code: fields.code.toUpperCase().trim(),
      description: fields.description || null,
      max_discount: fields.max_discount ?? null,
      usage_limit: fields.usage_limit ?? null,
    };
    const { error } = id
      ? await context.supabase.from("coupons").update(payload).eq("id", id)
      : await context.supabase.from("coupons").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- REVIEWS ------------------------------- */

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reviews")
      .select("id, rating, title, body, author_name, is_approved, created_at, product:products(name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetReviewApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; approved: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reviews")
      .update({ is_approved: data.approved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- RETURNS ------------------------------- */

export const adminListReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("order_returns")
      .select("id, reason, details, status, created_at, order:orders(order_number, total, recipient_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetReturnStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("order_returns")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- SETTINGS ------------------------------ */

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("app_settings").select("key, value");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { entries: Array<{ key: string; value: unknown }> }) => data)
  .handler(async ({ data, context }) => {
    for (const entry of data.entries) {
      const { error } = await context.supabase
        .from("app_settings")
        .upsert({ key: entry.key, value: entry.value as never, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ----------------------------- NOTIFICATIONS --------------------------- */

export const adminBroadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { title: string; body: string; audience: "all" | "admins" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let userIds: string[] = [];
    if (data.audience === "admins") {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      userIds = (roles ?? []).map((r) => r.user_id);
    } else {
      const { data: profiles } = await supabase.from("profiles").select("id");
      userIds = (profiles ?? []).map((p) => p.id);
    }
    if (userIds.length === 0) return { sent: 0 };

    const { error } = await supabase.from("notifications").insert(
      userIds.map((id) => ({
        user_id: id,
        title: data.title.slice(0, 120),
        body: data.body.slice(0, 1000),
        type: "promo",
      })),
    );
    if (error) throw new Error(error.message);
    return { sent: userIds.length };
  });
