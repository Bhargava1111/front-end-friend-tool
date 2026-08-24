import { apiFetch, toJsonBody } from "@/lib/api";
import { analyticsHeaders, getLastSearch } from "@/lib/analytics";
import { ensureValidAccessToken } from "@/lib/auth-session";

async function requireToken() {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Please sign in to continue.");
  return token;
}

/* ------------------------------- CART ------------------------------- */

export async function getCart() {
  const token = await requireToken();
  const data = await apiFetch<{ items: unknown[] }>("/cart/", { token });
  return data.items ?? [];
}

export async function addToCart({
  data,
}: {
  data: { productId: string; quantity?: number; variantId?: string | null };
}) {
  const token = await requireToken();
  await apiFetch("/cart/", {
    method: "POST",
    token,
    headers: analyticsHeaders(),
    body: toJsonBody({
      product_id: data.productId,
      variant_id: data.variantId,
      quantity: data.quantity ?? 1,
      search_id: getLastSearch()?.id,
    }),
  });
  return { ok: true };
}

export async function setCartQuantity({ data }: { data: { itemId: string; quantity: number } }) {
  const token = await requireToken();
  await apiFetch(`/cart/${data.itemId}/`, {
    method: "PATCH",
    token,
    body: toJsonBody({ quantity: data.quantity }),
  });
  return { ok: true };
}

export async function removeCartItem({ data }: { data: { itemId: string } }) {
  const token = await requireToken();
  await apiFetch(`/cart/${data.itemId}/`, {
    method: "DELETE",
    token,
  });
  return { ok: true };
}

/* ----------------------------- WISHLIST ----------------------------- */

export async function getWishlist() {
  const token = await requireToken();
  return apiFetch("/wishlist/", { token });
}

export async function toggleWishlist({ data }: { data: { productId: string } }) {
  const token = await requireToken();
  const res = await apiFetch<{ wishlisted: boolean }>("/wishlist/", {
    method: "POST",
    token,
    body: toJsonBody({ product_id: data.productId }),
  });
  return { wishlisted: res.wishlisted };
}

/* ----------------------------- ADDRESSES ---------------------------- */

export async function getAddresses() {
  const token = await requireToken();
  return apiFetch("/me/addresses/", { token });
}

export async function saveAddress({
  data,
}: {
  data: {
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
  };
}) {
  const token = await requireToken();
  const { id, ...fields } = data;
  if (id) {
    await apiFetch(`/me/addresses/${id}/`, {
      method: "PATCH",
      token,
      body: toJsonBody(fields),
    });
  } else {
    await apiFetch("/me/addresses/", {
      method: "POST",
      token,
      body: toJsonBody(fields),
    });
  }
  return { ok: true };
}

export async function deleteAddress({ data }: { data: { id: string } }) {
  const token = await requireToken();
  await apiFetch(`/me/addresses/${data.id}/`, {
    method: "DELETE",
    token,
  });
  return { ok: true };
}

/* ------------------------------ PROFILE ----------------------------- */

export async function getProfile() {
  const token = await requireToken();
  return apiFetch("/me/", { token });
}

export async function updateProfile({
  data,
}: {
  data: {
    first_name: string;
    last_name: string;
    gst_number?: string;
    avatar_url?: string;
  };
}) {
  const token = await requireToken();
  await apiFetch("/me/", {
    method: "PATCH",
    token,
    body: toJsonBody(data),
  });
  return { ok: true };
}

/* ------------------------------ ORDERS ------------------------------ */

export async function getOrders() {
  const token = await requireToken();
  return apiFetch("/orders/", { token });
}

export async function getOrder({ data }: { data: { id: string } }) {
  const token = await requireToken();
  return apiFetch(`/orders/${data.id}/`, { token });
}

export async function placeOrder({
  data,
}: {
  data: {
    addressId: string;
    notes?: string;
    couponCode?: string;
    deliverySlot?: string;
    paymentMethod?: string;
  };
}) {
  const token = await requireToken();
  return apiFetch<{ id: string; orderNumber: string }>("/orders/", {
    method: "POST",
    token,
    headers: analyticsHeaders(),
    body: toJsonBody({
      address_id: data.addressId,
      notes: data.notes,
      couponCode: data.couponCode,
      deliverySlot: data.deliverySlot,
      paymentMethod: data.paymentMethod,
      search_id: getLastSearch()?.id,
    }),
  });
}

export async function cancelOrder({ data }: { data: { id: string } }) {
  const token = await requireToken();
  await apiFetch(`/orders/${data.id}/cancel/`, {
    method: "POST",
    token,
  });
  return { ok: true };
}
