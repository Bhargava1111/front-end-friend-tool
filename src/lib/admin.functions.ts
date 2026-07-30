import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCT_COLUMNS } from "./catalog.server";

/* ------------------------------- ACCESS ------------------------------ */

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

/* ------------------------------ DASHBOARD ---------------------------- */

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [ordersRes, productsRes, customersRes, itemsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, recipient_name")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("products").select("id, name, stock, price, is_active, category_id"),
      supabase.from("profiles").select("id, full_name, created_at"),
      supabase.from("order_items").select("product_name, quantity, line_total").limit(2000),
    ]);

    const orders = ordersRes.data ?? [];
    const products = productsRes.data ?? [];
    const items = itemsRes.data ?? [];

    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Revenue for the last 14 days.
    const days: Array<{ day: string; revenue: number; orders: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.created_at.slice(0, 10) === key);
      days.push({
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: dayOrders
          .filter((o) => o.status !== "cancelled")
          .reduce((s, o) => s + Number(o.total), 0),
        orders: dayOrders.length,
      });
    }

    const statusCounts = ["pending", "confirmed", "packed", "delivered", "cancelled"].map(
      (status) => ({ status, count: orders.filter((o) => o.status === status).length }),
    );

    const topMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of items) {
      const prev = topMap.get(item.product_name) ?? { name: item.product_name, qty: 0, revenue: 0 };
      prev.qty += item.quantity;
      prev.revenue += Number(item.line_total);
      topMap.set(item.product_name, prev);
    }
    const topProducts = [...topMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    return {
      revenue,
      orderCount: orders.length,
      customerCount: customersRes.data?.length ?? 0,
      productCount: products.length,
      lowStock: products.filter((p) => p.stock <= 5).length,
      avgOrderValue: orders.length ? revenue / orders.length : 0,
      days,
      statusCounts,
      topProducts,
      recentOrders: orders.slice(0, 8),
    };
  });

/* ------------------------------- ORDERS ------------------------------ */

export const getAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      status: "pending" | "confirmed" | "packed" | "delivered" | "cancelled";
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ PRODUCTS ----------------------------- */

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [products, categories] = await Promise.all([
      context.supabase
        .from("products")
        .select(`${PRODUCT_COLUMNS}, is_active`)
        .order("name"),
      context.supabase.from("categories").select("id, name, slug").order("name"),
    ]);
    return { products: products.data ?? [], categories: categories.data ?? [] };
  });

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      slug: string;
      price: number;
      mrp: number | null;
      stock: number;
      weight: string | null;
      category_id: string | null;
      image_url: string | null;
      video_url: string | null;
      description: string | null;
      is_active: boolean;
      is_featured: boolean;
      is_best_seller: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase.from("products").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("products").insert(fields);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });


export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- CUSTOMERS ----------------------------- */

export const getAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profiles, orders] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("orders").select("user_id, total, status"),
    ]);
    const spendByUser = new Map<string, { orders: number; spend: number }>();
    for (const o of orders.data ?? []) {
      const prev = spendByUser.get(o.user_id) ?? { orders: 0, spend: 0 };
      prev.orders += 1;
      if (o.status !== "cancelled") prev.spend += Number(o.total);
      spendByUser.set(o.user_id, prev);
    }
    return (profiles.data ?? []).map((p) => ({
      ...p,
      orders: spendByUser.get(p.id)?.orders ?? 0,
      spend: spendByUser.get(p.id)?.spend ?? 0,
    }));
  });

/* ------------------------------- STORES ------------------------------ */

export const getAdminStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_locations")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      address_text: string;
      city: string;
      state: string;
      pincode: string;
      latitude: number;
      longitude: number;
      phone: string | null;
      opening_hours: string;
      delivery_radius_km: number;
      is_active: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase.from("store_locations").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("store_locations").insert(fields);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAdminStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_locations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- BANNERS ----------------------------- */

export const getAdminBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("banners")
      .select("*")
      .order("sort_order");
    return data ?? [];
  });

export const toggleAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_active: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("banners")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
