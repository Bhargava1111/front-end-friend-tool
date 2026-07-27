import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCT_COLUMNS } from "./catalog.server";

/* ------------------------------- CART ------------------------------- */

export const getCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cart_items")
      .select(`id, quantity, product:products(${PRODUCT_COLUMNS})`)
      .eq("user_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).filter((l) => l.product);
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; quantity?: number }) => data)
  .handler(async ({ data, context }) => {
    const qty = data.quantity ?? 1;
    const { data: existing } = await context.supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", context.userId)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("cart_items")
        .insert({ user_id: context.userId, product_id: data.productId, quantity: qty });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setCartQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string; quantity: number }) => data)
  .handler(async ({ data, context }) => {
    if (data.quantity <= 0) {
      const { error } = await context.supabase.from("cart_items").delete().eq("id", data.itemId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("cart_items")
      .update({ quantity: data.quantity })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cart_items").delete().eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- WISHLIST ----------------------------- */

export const getWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wishlist_items")
      .select(`id, product:products(${PRODUCT_COLUMNS})`)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).filter((w) => w.product);
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("wishlist_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing) {
      await context.supabase.from("wishlist_items").delete().eq("id", existing.id);
      return { wishlisted: false };
    }
    const { error } = await context.supabase
      .from("wishlist_items")
      .insert({ user_id: context.userId, product_id: data.productId });
    if (error) throw new Error(error.message);
    return { wishlisted: true };
  });

/* ----------------------------- ADDRESSES ---------------------------- */

export const getAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("addresses")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      label: string;
      recipient_name: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      is_default: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (fields.is_default) {
      await context.supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", context.userId);
    }
    if (id) {
      const { error } = await context.supabase.from("addresses").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("addresses")
        .insert({ ...fields, user_id: context.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ PROFILE ----------------------------- */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    return (
      data ?? { id: context.userId, full_name: null, phone: null, avatar_url: null }
    );
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { full_name: string; phone: string; avatar_url?: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, ...data })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ ORDERS ------------------------------ */

export const getOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    return order;
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { addressId: string; notes?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", data.addressId)
      .maybeSingle();
    if (!address) throw new Error("Delivery address not found");

    const { data: cart } = await supabase
      .from("cart_items")
      .select(`id, quantity, product:products(id, name, weight, price, image_url)`)
      .eq("user_id", userId);

    const lines = (cart ?? []).filter((l) => l.product);
    if (lines.length === 0) throw new Error("Your cart is empty");

    const subtotal = lines.reduce((sum, l) => sum + Number(l.product!.price) * l.quantity, 0);
    const deliveryFee = subtotal >= 499 ? 0 : 40;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal,
        delivery_fee: deliveryFee,
        total: subtotal + deliveryFee,
        recipient_name: address.recipient_name,
        phone: address.phone,
        address_text: [address.line1, address.line2, address.city, address.state, address.pincode]
          .filter(Boolean)
          .join(", "),
        notes: data.notes ?? null,
      })
      .select("id, order_number")
      .single();
    if (orderError || !order) throw new Error(orderError?.message ?? "Could not create order");

    const { error: itemsError } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product!.id,
        product_name: l.product!.name,
        product_weight: l.product!.weight,
        image_url: l.product!.image_url,
        unit_price: Number(l.product!.price),
        quantity: l.quantity,
        line_total: Number(l.product!.price) * l.quantity,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    await supabase.from("cart_items").delete().eq("user_id", userId);

    return { id: order.id, orderNumber: order.order_number };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
