import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { toJsonBody } from "@/lib/api";
import { adminFetchServer as adminFetch } from "@/lib/admin-api.server";

function admin(token: string, path: string, init?: RequestInit) {
  return adminFetch(token, path, init);
}

export const getAdminTickets = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/tickets/"));

export const updateAdminTicket = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; status?: string; admin_notes?: string }) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/tickets/", { method: "PATCH", body: toJsonBody(data) }),
  );

export const getAdminActivityLogs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/activity-logs/"));

export const getAdminPincodes = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/pincodes/"));

export const saveAdminPincode = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { pincode: string; city?: string; is_active?: boolean }) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/pincodes/", { method: "POST", body: toJsonBody(data) }),
  );

export const getAdminRiders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/riders/"));

export const saveAdminRider = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/riders/", { method: "POST", body: toJsonBody(data) }),
  );

export const assignDelivery = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { order_id: string; rider_id: string; earnings?: number }) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/delivery/", { method: "POST", body: toJsonBody(data) }),
  );

export const getAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/payments/"));

export const processAdminRefund = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { return_id: string; amount?: number; method?: string }) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/refunds/", { method: "POST", body: toJsonBody(data) }),
  );

export const manageAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: string; is_active?: boolean; admin_role?: string }) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, `/admin-api/users/${data.id}/manage/`, {
      method: "PATCH",
      body: toJsonBody(data),
    }),
  );

export const getAdminBOGO = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => admin(context.accessToken, "/admin-api/promotions/bogo/"));

export const saveAdminBOGO = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/promotions/bogo/", { method: "POST", body: toJsonBody(data) }),
  );

export const getAdminCategoryDiscounts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    admin(context.accessToken, "/admin-api/promotions/category-discounts/"),
  );

export const saveAdminCategoryDiscount = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: Record<string, unknown>) => data)
  .handler(async ({ data, context }) =>
    admin(context.accessToken, "/admin-api/promotions/category-discounts/", {
      method: "POST",
      body: toJsonBody(data),
    }),
  );

export const getDeliveryPerformance = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    admin(context.accessToken, "/admin-api/delivery/performance/"),
  );
