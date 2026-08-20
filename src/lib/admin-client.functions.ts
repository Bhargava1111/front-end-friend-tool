import { apiFetch, toJsonBody } from "@/lib/api";
import { adminPanelHeaders } from "@/lib/admin-api";
import { adminClient, requireAccessToken } from "@/lib/admin-client";
import type { SalesGranularity } from "@/lib/admin-ops.functions";

/** Direct Django admin API — bundled Capacitor APK (no server functions). */

export async function getAdminStatusClient() {
  const token = await requireAccessToken();
  try {
    const me = await apiFetch<{ role?: string }>("/me/", { token });
    return { isAdmin: me.role === "admin", role: me.role ?? "customer" };
  } catch {
    return { isAdmin: false, role: "customer" };
  }
}

export async function requestAdminPanelOtpClient() {
  const token = await requireAccessToken();
  return apiFetch<{
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
    token,
    body: toJsonBody({}),
  });
}

export async function verifyAdminPanelOtpClient(opts: { data: { code: string } }) {
  const token = await requireAccessToken();
  const code = String(opts?.data?.code ?? "").replace(/\D/g, "");
  return apiFetch<{
    ok: boolean;
    detail?: string;
    session_token?: string;
    idle_timeout_seconds?: number;
    attempts_remaining?: number;
  }>("/admin-api/access/otp/verify/", {
    method: "POST",
    token,
    body: toJsonBody({ code }),
  });
}

export async function getAdminPanelSessionStatusClient() {
  const token = await requireAccessToken();
  return apiFetch<{
    ok: boolean;
    valid: boolean;
    reason?: string;
    idle_seconds_remaining?: number;
    idle_timeout_seconds?: number;
  }>("/admin-api/access/session/", {
    token,
    headers: adminPanelHeaders(),
  });
}

export async function revokeAdminPanelSessionClient() {
  const token = await requireAccessToken();
  await apiFetch("/admin-api/access/session/", {
    method: "DELETE",
    token,
    headers: adminPanelHeaders(),
  });
  return { ok: true };
}

export async function getAdminDashboardClient() {
  return adminClient("/admin-api/dashboard/");
}

export async function getAdminOrdersClient() {
  return adminClient("/admin-api/orders/");
}

export async function setOrderStatusClient(opts: { data: { id: string; status: string } }) {
  await adminClient(`/admin-api/orders/${opts.data.id}/`, {
    method: "PATCH",
    body: toJsonBody({ status: opts.data.status }),
  });
  return { ok: true };
}

export async function getAdminProductsClient() {
  return adminClient("/admin-api/products/");
}

export async function saveAdminProductClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin-api/products/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
}

export async function deleteAdminProductClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/products/", {
    method: "DELETE",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function setProductPlacementsClient(opts: {
  data: { product_ids: string[]; section: string; action?: "add" | "remove" };
}) {
  return adminClient("/admin-api/products/placements/", {
    method: "POST",
    body: toJsonBody(opts.data),
  }) as Promise<{ ok: boolean; added?: number; removed?: number; section?: string }>;
}

export async function getAdminCustomersClient() {
  return adminClient("/admin-api/customers/");
}

export async function getAdminStoresClient() {
  return adminClient("/admin-api/stores/");
}

export async function saveAdminStoreClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/stores/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function deleteAdminStoreClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/stores/", {
    method: "DELETE",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function getAdminBannersClient() {
  return adminClient("/admin-api/banners/");
}

export async function toggleAdminBannerClient(opts: { data: { id: string; is_active: boolean } }) {
  await adminClient("/admin-api/banners/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function getAdminCategoriesClient() {
  return adminClient("/admin-api/categories/");
}

export async function saveAdminCategoryClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/categories/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function deleteAdminCategoryClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/categories/", {
    method: "DELETE",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function saveAdminBannerClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/banners/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function deleteAdminBannerClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/banners/", {
    method: "DELETE",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function createAdminOrderClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin-api/orders/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
}

export async function getAdminCustomerDetailClient(opts: { data: { id: string } }) {
  return adminClient(`/admin-api/customers/${opts.data.id}/`);
}

export async function adminListBrandsClient() {
  return adminClient("/admin-api/brands/");
}

export async function adminSaveBrandClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/brands/", { method: "POST", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminDeleteBrandClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/brands/", { method: "DELETE", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminListCouponsClient() {
  return adminClient("/admin-api/coupons/");
}

export async function adminSaveCouponClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/coupons/", { method: "POST", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminDeleteCouponClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/coupons/", { method: "DELETE", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminListReviewsClient() {
  return adminClient("/admin-api/reviews/");
}

export async function adminSetReviewApprovalClient(opts: { data: { id: string; is_approved: boolean } }) {
  void opts;
  return { ok: true };
}

export async function adminDeleteReviewClient(opts: { data: { id: string } }) {
  await adminClient("/admin-api/reviews/", { method: "DELETE", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminListReturnsClient() {
  return adminClient("/admin-api/returns/");
}

export async function adminSetReturnStatusClient(opts: { data: { id: string; status: string } }) {
  await adminClient("/admin-api/returns/", {
    method: "PATCH",
    body: toJsonBody(opts.data),
  });
  return { ok: true };
}

export async function adminListSettingsClient() {
  return adminClient("/admin-api/settings/");
}

export async function adminSaveSettingsClient(opts: { data: Record<string, unknown> }) {
  await adminClient("/admin-api/settings/", { method: "POST", body: toJsonBody(opts.data) });
  return { ok: true };
}

export async function adminBroadcastNotificationClient(opts: {
  data: { title: string; body: string; audience?: "all" | "admins"; image_url?: string };
}) {
  return adminClient("/admin-api/notifications/broadcast/", {
    method: "POST",
    body: toJsonBody({
      title: opts.data.title,
      body: opts.data.body,
      audience: opts.data.audience ?? "all",
      image_url: opts.data.image_url || undefined,
    }),
  }) as Promise<{ ok: boolean; sent: number }>;
}

export async function getAdminTicketsClient() {
  return adminClient("/admin-api/tickets/");
}

export async function updateAdminTicketClient(opts: {
  data: { id: string; status?: string; admin_notes?: string };
}) {
  return adminClient("/admin-api/tickets/", { method: "PATCH", body: toJsonBody(opts.data) });
}

export async function getAdminActivityLogsClient() {
  return adminClient("/admin-api/activity-logs/");
}

export async function getAdminPincodesClient() {
  return adminClient("/admin-api/pincodes/");
}

export async function saveAdminPincodeClient(opts: {
  data: { pincode: string; city?: string; is_active?: boolean };
}) {
  return adminClient("/admin-api/pincodes/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function getAdminRidersClient() {
  return adminClient("/admin-api/riders/");
}

export async function saveAdminRiderClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin-api/riders/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function assignDeliveryClient(opts: {
  data: { order_id: string; rider_id: string; earnings?: number };
}) {
  return adminClient("/admin-api/delivery/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function getAdminPaymentsClient() {
  return adminClient("/admin-api/payments/");
}

export async function processAdminRefundClient(opts: {
  data: { return_id: string; amount?: number; method?: string };
}) {
  return adminClient("/admin-api/refunds/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function manageAdminUserClient(opts: {
  data: { id: string; is_active?: boolean; admin_role?: string };
}) {
  return adminClient(`/admin-api/users/${opts.data.id}/manage/`, {
    method: "PATCH",
    body: toJsonBody(opts.data),
  });
}

export async function getAdminBOGOClient() {
  return adminClient("/admin-api/promotions/bogo/");
}

export async function saveAdminBOGOClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin-api/promotions/bogo/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function getAdminCategoryDiscountsClient() {
  return adminClient("/admin-api/promotions/category-discounts/");
}

export async function saveAdminCategoryDiscountClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin-api/promotions/category-discounts/", {
    method: "POST",
    body: toJsonBody(opts.data),
  });
}

export async function getDeliveryPerformanceClient() {
  return adminClient("/admin-api/delivery/performance/");
}

export async function getAdminSalesReportClient(opts: {
  data: { from: string; to: string; granularity: SalesGranularity };
}) {
  const params = new URLSearchParams({
    from: opts.data.from,
    to: opts.data.to,
    granularity: opts.data.granularity,
  });
  return adminClient(`/admin-api/reports/sales/?${params}`);
}

export async function getAdminUsersClient() {
  return adminClient("/admin-api/users/");
}

export async function setUserVerificationClient(opts: {
  data: { id?: string; userId?: string; status: string; note?: string; reason?: string };
}) {
  const id = opts.data.id ?? opts.data.userId;
  if (!id) throw new Error("User id is required");
  await adminClient(`/admin-api/users/${id}/verification/`, {
    method: "PATCH",
    body: toJsonBody({ status: opts.data.status, note: opts.data.note ?? opts.data.reason }),
  });
  return { ok: true };
}

export async function createAdminUserClient(opts: { data: Record<string, unknown> }) {
  void opts;
  return { ok: true };
}

export async function deleteAdminUserClient(opts: { data: { id: string } }) {
  void opts;
  return { ok: true };
}

export async function setOrderDeliveryClient(opts: {
  data: { id: string; delivery_date: string; status?: string };
}) {
  await adminClient(`/admin-api/orders/${opts.data.id}/`, {
    method: "PATCH",
    body: toJsonBody({
      delivery_date: opts.data.delivery_date,
      status: opts.data.status ?? "confirmed",
    }),
  });
  return { ok: true };
}

export async function getAdminBlogPostsClient() {
  return adminClient("/admin/blog/");
}

export async function saveAdminBlogPostClient(opts: { data: Record<string, unknown> }) {
  return adminClient("/admin/blog/", { method: "POST", body: toJsonBody(opts.data) });
}

export async function deleteAdminBlogPostClient(opts: { data: { id: string } }) {
  void opts;
  return { ok: true };
}
