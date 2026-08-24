import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { toJsonBody } from "@/lib/api";
import { adminFetchServer as adminFetch } from "@/lib/admin-api.server";
import { analyticsQuery, type AnalyticsFilters } from "@/lib/admin-analytics";

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
  .inputValidator((data?: { q?: string; status?: string }) => data ?? {})
  .handler(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data?.q?.trim()) params.set("q", data.q.trim());
    if (data?.status?.trim()) params.set("status", data.status.trim());
    const qs = params.toString();
    return admin(context.accessToken, `/admin-api/users/${qs ? `?${qs}` : ""}`);
  });

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
    return admin(context.accessToken, "/admin-api/users/", {
      method: "POST",
      body: toJsonBody(data),
    });
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

export type { AnalyticsFilters } from "@/lib/admin-analytics";
export const getAdminSearchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/analytics/searches/?${analyticsQuery(data ?? { preset: "30d", visitor: "all" })}`),
  );

export const getAdminZeroResultSearches = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(
      context.accessToken,
      `/admin-api/analytics/searches/zero-results/?${analyticsQuery(data ?? { preset: "30d", visitor: "all" })}`,
    ),
  );

export const getAdminSearchQueryDetail = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/analytics/searches/query/?${analyticsQuery(data)}`),
  );

export const getAdminProductViewAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/analytics/products/?${analyticsQuery(data ?? { preset: "30d", visitor: "all" })}`),
  );

export const getAdminProductViewDetail = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: AnalyticsFilters & { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { id, ...filters } = data;
    return admin(context.accessToken, `/admin-api/analytics/products/${id}/?${analyticsQuery(filters)}`);
  });

export const getAdminCustomerBehavior = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/analytics/behavior/?${analyticsQuery(data ?? { preset: "30d", visitor: "all" })}`),
  );

export const getAdminUserActivity = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: AnalyticsFilters) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/analytics/activity/?${analyticsQuery(data ?? { preset: "30d", visitor: "all" })}`),
  );
