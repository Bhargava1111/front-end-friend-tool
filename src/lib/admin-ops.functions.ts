import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* -------------------------- shared admin guard ------------------------ */

async function assertAdmin(context: { supabase: ReturnType<typeof Object> } & {
  supabase: any;
  userId: string;
}) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only");
}

/* ----------------------------- SALES REPORT --------------------------- */

export type SalesGranularity = "day" | "week" | "month";

function bucketKey(iso: string, granularity: SalesGranularity) {
  const d = new Date(iso);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "month") return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export const getAdminSalesReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { from: string; to: string; granularity: SalesGranularity }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const fromIso = new Date(`${data.from}T00:00:00.000Z`).toISOString();
    const toIso = new Date(`${data.to}T23:59:59.999Z`).toISOString();

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, subtotal, discount, tax, delivery_fee, total, created_at, recipient_name, phone, payment_method, delivery_date")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const rows = orders ?? [];
    const paid = rows.filter((o) => o.status !== "cancelled");

    const map = new Map<string, { bucket: string; revenue: number; orders: number; items: number }>();
    for (const o of rows) {
      const key = bucketKey(o.created_at, data.granularity);
      const prev = map.get(key) ?? { bucket: key, revenue: 0, orders: 0, items: 0 };
      prev.orders += 1;
      if (o.status !== "cancelled") prev.revenue += Number(o.total);
      map.set(key, prev);
    }
    const buckets = [...map.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));

    const ids = paid.map((o) => o.id);
    let topProducts: Array<{ name: string; qty: number; revenue: number }> = [];
    if (ids.length) {
      const { data: items } = await context.supabase
        .from("order_items")
        .select("order_id, product_name, quantity, line_total")
        .in("order_id", ids.slice(0, 900));
      const agg = new Map<string, { name: string; qty: number; revenue: number }>();
      for (const it of items ?? []) {
        const prev = agg.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 };
        prev.qty += it.quantity;
        prev.revenue += Number(it.line_total);
        agg.set(it.product_name, prev);
      }
      topProducts = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    }

    const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const statusCounts = ["pending", "confirmed", "packed", "delivered", "cancelled"].map(
      (status) => ({ status, count: rows.filter((o) => o.status === status).length }),
    );

    return {
      buckets,
      topProducts,
      statusCounts,
      totals: {
        revenue,
        orders: rows.length,
        cancelled: rows.length - paid.length,
        avgOrderValue: paid.length ? revenue / paid.length : 0,
        discount: paid.reduce((s, o) => s + Number(o.discount ?? 0), 0),
        tax: paid.reduce((s, o) => s + Number(o.tax ?? 0), 0),
        delivery: paid.reduce((s, o) => s + Number(o.delivery_fee ?? 0), 0),
      },
      orders: rows.slice(0, 500),
    };
  });

/* --------------------------- USER VERIFICATION ------------------------ */

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, full_name, phone, address_text, pincode, latitude, longitude, location_accuracy_m, verification_status, rejection_reason, submitted_at, verified_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setUserVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { userId: string; status: "verified" | "rejected" | "pending"; reason?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: data.status,
        verified_at: data.status === "verified" ? new Date().toISOString() : null,
        verified_by: data.status === "verified" ? context.userId : null,
        rejection_reason: data.status === "rejected" ? (data.reason ?? "Details could not be verified") : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      email: string;
      password: string;
      full_name: string;
      phone: string;
      address_text?: string;
      role: "customer" | "admin";
      verified: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the user");

    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name: data.full_name,
      phone: data.phone,
      address_text: data.address_text ?? null,
      verification_status: data.verified ? "verified" : "pending",
      verified_at: data.verified ? new Date().toISOString() : null,
      verified_by: data.verified ? context.userId : null,
    });
    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    return { id: created.user.id };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId) throw new Error("You cannot remove your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- DELIVERY ----------------------------- */

export const setOrderDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; delivery_date: string | null; status?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("orders")
      .update({
        delivery_date: data.delivery_date,
        ...(data.status ? { status: data.status as "pending" } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- BLOG ------------------------------- */

export const getAdminBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      title: string;
      slug: string;
      excerpt: string;
      body: string;
      cover_url: string | null;
      author: string;
      tags: string[];
      read_minutes: number;
      is_published: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const row = {
      title: data.title.trim(),
      slug: data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      excerpt: data.excerpt.trim() || null,
      body: data.body.trim(),
      cover_url: data.cover_url,
      author: data.author.trim() || null,
      tags: data.tags,
      read_minutes: data.read_minutes,
      is_published: data.is_published,
      published_at: data.is_published ? new Date().toISOString() : null,
    };
    const query = data.id
      ? context.supabase.from("blog_posts").update(row).eq("id", data.id)
      : context.supabase.from("blog_posts").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
