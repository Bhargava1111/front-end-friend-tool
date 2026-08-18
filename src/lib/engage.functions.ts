import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { apiFetch, toJsonBody } from "@/lib/api";

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    await apiFetch(`/products/${data.productId}/reviews/submit/`, {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({
        rating: data.rating,
        title: data.title,
        body: data.body,
        author_name: data.authorName,
      }),
    });
    return { ok: true };
  });

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { orderId: string; reason: string; details?: string }) => data)
  .handler(async ({ data, context }) => {
    await apiFetch("/returns/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({
        order_id: data.orderId,
        reason: data.reason,
        details: data.details,
      }),
    });
    return { ok: true };
  });

export const getReturnsForOrder = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) =>
    apiFetch(`/returns/?order_id=${data.orderId}`, { token: context.accessToken }),
  );

export const reorder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const order = await apiFetch<{ order_items?: { product_id?: string; quantity: number }[] }>(
      `/orders/${data.orderId}/`,
      { token: context.accessToken },
    );
    let added = 0;
    let skipped = 0;
    for (const item of order.order_items ?? []) {
      if (!item.product_id) {
        skipped += 1;
        continue;
      }
      try {
        await apiFetch("/cart/", {
          method: "POST",
          token: context.accessToken,
          body: toJsonBody({ product_id: item.product_id, quantity: item.quantity }),
        });
        added += 1;
      } catch {
        skipped += 1;
      }
    }
    return { added, skipped };
  });
