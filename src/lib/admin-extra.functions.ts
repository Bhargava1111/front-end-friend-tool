import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { toJsonBody } from "@/lib/api";
import { adminFetchServer as adminFetch } from "@/lib/admin-api.server";

function admin(token: string, path: string, init?: RequestInit) {
  return adminFetch(token, path, init);
}

export const adminListBrands = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/brands/"));

export const adminSaveBrand = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/brands/", { method: "POST", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/brands/", { method: "DELETE", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminListHomeSections = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/home-sections/"));

export const adminSaveHomeSection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    const res = await admin(context.accessToken, "/admin-api/home-sections/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return res;
  });

export const adminDeleteHomeSection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/home-sections/", { method: "DELETE", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminReorderHomeSection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; direction: "up" | "down" }) => data)
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, "/admin-api/home-sections/", {
      method: "PATCH",
      body: toJsonBody({ action: "move", id: data.id, direction: data.direction }),
    }) as Promise<{ ok: boolean; moved: boolean }>;
  });

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/coupons/"));

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/coupons/", { method: "POST", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/coupons/", { method: "DELETE", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/reviews/"));

export const adminSetReviewApproval = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; is_approved: boolean }) => data)
  .handler(async ({ data, context }) => {
    void data;
    void context;
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/reviews/", { method: "DELETE", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminListReturns = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/returns/"));

export const adminSetReturnStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/returns/", {
      method: "PATCH",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/settings/"));

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/settings/", { method: "POST", body: toJsonBody(data) });
    return { ok: true };
  });

export const adminBroadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { title: string; body: string; audience?: "all" | "admins"; image_url?: string }) => data)
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, "/admin-api/notifications/broadcast/", {
      method: "POST",
      body: toJsonBody({
        title: data.title,
        body: data.body,
        audience: data.audience ?? "all",
        image_url: data.image_url || undefined,
      }),
    }) as Promise<{ ok: boolean; sent: number }>;
  });
