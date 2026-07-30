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
  .inputValidator(
    (data: {
      addressId: string;
      notes?: string;
      couponCode?: string;
      deliverySlot?: string;
      paymentMethod?: string;
    }) => data,
  )
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

    // Store-level settings drive fees and tax.
    const { data: settingRows } = await supabase.from("app_settings").select("key, value");
    const settings = Object.fromEntries((settingRows ?? []).map((r) => [r.key, r.value])) as Record<
      string,
      unknown
    >;
    const deliveryBase = Number(settings.delivery_fee ?? 40);
    const freeAbove = Number(settings.free_delivery_above ?? 499);
    const taxRate = Number(settings.tax_rate ?? 0);

    let discount = 0;
    let freeShipping = false;
    let appliedCode: string | null = null;

    if (data.couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value, min_order, max_discount, is_active, ends_at")
        .eq("code", data.couponCode.toUpperCase())
        .maybeSingle();
      const valid =
        coupon &&
        coupon.is_active &&
        subtotal >= Number(coupon.min_order) &&
        (!coupon.ends_at || new Date(coupon.ends_at) > new Date());
      if (valid) {
        appliedCode = coupon!.code;
        if (coupon!.discount_type === "percent") {
          discount = (subtotal * Number(coupon!.discount_value)) / 100;
          if (coupon!.max_discount) discount = Math.min(discount, Number(coupon!.max_discount));
        } else if (coupon!.discount_type === "flat") {
          discount = Number(coupon!.discount_value);
        } else if (coupon!.discount_type === "free_shipping") {
          freeShipping = true;
        }
      }
    }
    discount = Math.min(Math.round(discount), subtotal);

    const deliveryFee = freeShipping || subtotal >= freeAbove ? 0 : deliveryBase;
    const tax = Math.round(((subtotal - discount) * taxRate) / 100);
    const total = subtotal - discount + deliveryFee + tax;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        tax,
        coupon_code: appliedCode,
        delivery_slot: data.deliverySlot ?? null,
        payment_method: data.paymentMethod ?? "cod",
        total,
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
