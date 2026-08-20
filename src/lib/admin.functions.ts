import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { apiFetch, toJsonBody } from "@/lib/api";
import { adminFetchServer as adminFetch, adminPanelHeadersServer as adminPanelHeaders } from "@/lib/admin-api.server";

function admin(token: string, path: string, init?: RequestInit) {
  return adminFetch(token, path, init);
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const me = await apiFetch<{ role?: string }>("/me/", { token: context.accessToken });
      return { isAdmin: me.role === "admin", role: me.role ?? "customer" };
    } catch {
      return { isAdmin: false, role: "customer" };
    }
  });

export const requestAdminPanelOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    apiFetch<{
      ok: boolean;
      detail?: string;
      channel?: string;
      masked_target?: string;
      preview_code?: string;
      cooldown_seconds?: number;
      expires_in?: number;
      idle_timeout_seconds?: number;
    }>("/admin-api/access/otp/request/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({}),
    }),
  );

export const verifyAdminPanelOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { code: string }) => ({
    code: String(data?.code ?? "").replace(/\D/g, ""),
  }))
  .handler(async ({ data, context }) =>
    apiFetch<{
      ok: boolean;
      detail?: string;
      session_token?: string;
      idle_timeout_seconds?: number;
      attempts_remaining?: number;
    }>("/admin-api/access/otp/verify/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({ code: data.code }),
    }),
  );

export const getAdminPanelSessionStatus = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    apiFetch<{
      ok: boolean;
      valid: boolean;
      reason?: string;
      idle_seconds_remaining?: number;
      idle_timeout_seconds?: number;
    }>("/admin-api/access/session/", {
      token: context.accessToken,
      headers: adminPanelHeaders(),
    }),
  );

export const revokeAdminPanelSession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await apiFetch("/admin-api/access/session/", {
      method: "DELETE",
      token: context.accessToken,
      headers: adminPanelHeaders(),
    });
    return { ok: true };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/dashboard/"));

export const getAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data?: { customer?: string; open?: boolean }) => data ?? {})
  .handler(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data.customer) params.set("user_id", data.customer);
    if (data.open) params.set("open", "1");
    const qs = params.toString();
    return admin(context.accessToken, `/admin-api/orders/${qs ? `?${qs}` : ""}`);
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, `/admin-api/orders/${data.id}/`, {
      method: "PATCH",
      body: toJsonBody({ status: data.status }),
    });
    return { ok: true };
  });

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/products/"));

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    const res = await admin(context.accessToken, "/admin-api/products/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return res;
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/products/", {
      method: "DELETE",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const setProductPlacements = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (data: { product_ids: string[]; section: string; action?: "add" | "remove" }) => data,
  )
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, "/admin-api/products/placements/", {
      method: "POST",
      body: toJsonBody(data),
    }) as Promise<{ ok: boolean; added?: number; removed?: number; section?: string }>;
  });

export const getAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/customers/"));

export const getAdminStores = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/stores/"));

export const saveAdminStore = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/stores/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const deleteAdminStore = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/stores/", {
      method: "DELETE",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const getAdminBanners = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/banners/"));

export const toggleAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; is_active: boolean }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/banners/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const getAdminCategories = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/categories/"));

export const saveAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/categories/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/categories/", {
      method: "DELETE",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const saveAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/banners/", {
      method: "POST",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const deleteAdminBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await admin(context.accessToken, "/admin-api/banners/", {
      method: "DELETE",
      body: toJsonBody(data),
    });
    return { ok: true };
  });

export const createAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, "/admin-api/orders/", {
      method: "POST",
      body: toJsonBody(data),
    });
  });

export const getAdminCustomerDetail = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    return admin(context.accessToken, `/admin-api/customers/${data.id}/`);
  });
