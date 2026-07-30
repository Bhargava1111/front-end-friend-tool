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
    const [products, categories, images] = await Promise.all([
      context.supabase
        .from("products")
        .select(`${PRODUCT_COLUMNS}, is_active`)
        .order("name"),
      context.supabase.from("categories").select("id, name, slug").order("name"),
      context.supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .order("sort_order"),
    ]);

    const gallery = new Map<string, string[]>();
    for (const row of images.data ?? []) {
      const list = gallery.get(row.product_id) ?? [];
      list.push(row.image_url);
      gallery.set(row.product_id, list);
    }

    return {
      products: (products.data ?? []).map((p) => ({ ...p, gallery: gallery.get(p.id) ?? [] })),
      categories: categories.data ?? [],
    };
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
      gallery?: string[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, gallery, ...fields } = data;
    let productId = id;
    if (id) {
      const { error } = await context.supabase.from("products").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("products")
        .insert(fields)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      productId = created?.id;
    }

    if (gallery && productId) {
      await context.supabase.from("product_images").delete().eq("product_id", productId);
      const rows = gallery
        .map((url) => url.trim())
        .filter(Boolean)
        .map((image_url, i) => ({ product_id: productId!, image_url, sort_order: i }));
      if (rows.length) {
        const { error } = await context.supabase.from("product_images").insert(rows);
        if (error) throw new Error(error.message);
      }
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

/* ----------------------------- CATEGORIES ---------------------------- */

export const getAdminCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      slug: string;
      description: string | null;
      image_url: string | null;
      sort_order: number;
      is_active: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const res = id
      ? await context.supabase.from("categories").update(fields).eq("id", id)
      : await context.supabase.from("categories").insert(fields);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- BANNERS (CRUD) -------------------------- */

export const saveAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      title: string;
      subtitle: string | null;
      image_url: string;
      link_slug: string | null;
      sort_order: number;
      is_active: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const res = id
      ? await context.supabase.from("banners").update(fields).eq("id", id)
      : await context.supabase.from("banners").insert(fields);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const deleteAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------ MANUAL ORDER CREATION ---------------------- */

export const createAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      user_id: string;
      recipient_name: string;
      phone: string;
      address_text: string;
      notes: string | null;
      items: Array<{ product_id: string; quantity: number }>;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    if (data.items.length === 0) throw new Error("Add at least one product");

    const { data: products, error: productError } = await context.supabase
      .from("products")
      .select("id, name, weight, price, image_url")
      .in(
        "id",
        data.items.map((i) => i.product_id),
      );
    if (productError) throw new Error(productError.message);

    const lines = data.items.map((item) => {
      const product = (products ?? []).find((p) => p.id === item.product_id);
      if (!product) throw new Error("Product not found");
      const unit = Number(product.price);
      return {
        product_id: product.id,
        product_name: product.name,
        product_weight: product.weight,
        image_url: product.image_url,
        unit_price: unit,
        quantity: item.quantity,
        line_total: unit * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
    const deliveryFee = subtotal >= 499 ? 0 : 29;

    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .insert({
        user_id: data.user_id,
        status: "confirmed",
        subtotal,
        delivery_fee: deliveryFee,
        total: subtotal + deliveryFee,
        recipient_name: data.recipient_name,
        phone: data.phone,
        address_text: data.address_text,
        notes: data.notes,
      })
      .select("id, order_number")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await context.supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemsError) throw new Error(itemsError.message);

    return { ok: true, order_number: order.order_number };
  });
