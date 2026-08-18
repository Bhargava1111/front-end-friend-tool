import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { apiFetch, toJsonBody } from "@/lib/api";

/* ------------------------------- CART ------------------------------- */

export const getCart = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const data = await apiFetch<{ items: unknown[] }>("/cart/", { token: context.accessToken });
    return data.items ?? [];
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { productId: string; quantity?: number; variantId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch("/cart/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({
        product_id: data.productId,
        variant_id: data.variantId,
        quantity: data.quantity ?? 1,
      }),
    });
    return { ok: true };
  });

export const setCartQuantity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { itemId: string; quantity: number }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch(`/cart/${data.itemId}/`, {
      method: "PATCH",
      token: context.accessToken,
      body: toJsonBody({ quantity: data.quantity }),
    });
    return { ok: true };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { itemId: string }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch(`/cart/${data.itemId}/`, {
      method: "DELETE",
      token: context.accessToken,
    });
    return { ok: true };
  });

/* ----------------------------- WISHLIST ----------------------------- */

export const getWishlist = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch("/wishlist/", { token: context.accessToken });
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context }) => {
    const res = await apiFetch<{ wishlisted: boolean }>("/wishlist/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({ product_id: data.productId }),
    });
    return { wishlisted: res.wishlisted };
  });

/* ----------------------------- ADDRESSES ---------------------------- */

export const getAddresses = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch("/me/addresses/", { token: context.accessToken });
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
      landmark?: string;
      latitude?: number | null;
      longitude?: number | null;
      is_default: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    if (id) {
      await apiFetch(`/me/addresses/${id}/`, {
        method: "PATCH",
        token: context.accessToken,
        body: toJsonBody(fields),
      });
    } else {
      await apiFetch("/me/addresses/", {
        method: "POST",
        token: context.accessToken,
        body: toJsonBody(fields),
      });
    }
    return { ok: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch(`/me/addresses/${data.id}/`, {
      method: "DELETE",
      token: context.accessToken,
    });
    return { ok: true };
  });

/* ------------------------------ PROFILE ----------------------------- */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch("/me/", { token: context.accessToken });
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (data: {
      first_name: string;
      last_name: string;
      gst_number?: string;
      avatar_url?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await apiFetch("/me/", {
      method: "PATCH",
      token: context.accessToken,
      body: toJsonBody(data),
    });
    return { ok: true };
  });

/* ------------------------------ ORDERS ------------------------------ */

export const getOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch("/orders/", { token: context.accessToken });
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    return apiFetch(`/orders/${data.id}/`, { token: context.accessToken });
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    return apiFetch<{ id: string; orderNumber: string }>("/orders/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({
        address_id: data.addressId,
        notes: data.notes,
        couponCode: data.couponCode,
        deliverySlot: data.deliverySlot,
        paymentMethod: data.paymentMethod,
      }),
    });
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch(`/orders/${data.id}/cancel/`, {
      method: "POST",
      token: context.accessToken,
    });
    return { ok: true };
  });
