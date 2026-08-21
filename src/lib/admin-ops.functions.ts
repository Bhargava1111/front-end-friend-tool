import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { toJsonBody } from "@/lib/api";
import { adminFetchServer as adminFetch } from "@/lib/admin-api.server";

function admin(token: string, path: string, init?: RequestInit) {
  return adminFetch(token, path, init);
}

export type SalesGranularity = "day" | "week" | "month";

export const getAdminSalesReport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { from: string; to: string; granularity: SalesGranularity }) => data)
  .handler(async ({ data, context }) => {
    const params = new URLSearchParams({
      from: data.from,
      to: data.to,
      granularity: data.granularity,
    });
    return admin(context.accessToken, `/admin-api/reports/sales/?${params}`);
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/users/"));

export const setUserVerification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id?: string; userId?: string; status: string; note?: string; reason?: string }) => data)
  .handler(async ({ data, context }) => {
    const id = data.id ?? data.userId;
    if (!id) throw new Error("User id is required");
    await admin(context.accessToken, `/admin-api/users/${id}/verification/`, {
      method: "PATCH",
      body: toJsonBody({ status: data.status, note: data.note ?? data.reason }),
    });
    return { ok: true };
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    void data;
    void context;
    return { ok: true };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id?: string; userId?: string }) => data)
  .handler(async ({ data, context }) => {
    const id = data.id ?? data.userId;
    if (!id) throw new Error("User id is required");
    await admin(context.accessToken, `/admin-api/users/${id}/manage/`, { method: "DELETE" });
    return { ok: true };
  });

export const setOrderDelivery = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; delivery_date: string; status?: string }) => data)
  .handler(async ({ data, context }) => {
    const payload: Record<string, string> = { delivery_date: data.delivery_date };
    if (data.status) payload.status = data.status;
    await admin(context.accessToken, `/admin-api/orders/${data.id}/`, {
      method: "POST",
      body: toJsonBody(payload),
    });
    return { ok: true };
  });

export const getAdminBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin/blog/"));

export const saveAdminBlogPost = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, "/admin/blog/", { method: "POST", body: toJsonBody(data) });
  });

export const deleteAdminBlogPost = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    void data;
    void context;
    return { ok: true };
  });
