import fs from "fs";
import path from "path";

const root = path.join(import.meta.dirname, "../src");

const clientMap = {
  getAdminTickets: "getAdminTicketsClient",
  updateAdminTicket: "updateAdminTicketClient",
  getAdminOrders: "getAdminOrdersClient",
  setOrderStatus: "setOrderStatusClient",
  setOrderDelivery: "setOrderDeliveryClient",
  getAdminUsers: "getAdminUsersClient",
  setUserVerification: "setUserVerificationClient",
  deleteAdminUser: "deleteAdminUserClient",
  getAdminStores: "getAdminStoresClient",
  deleteAdminStore: "deleteAdminStoreClient",
  getAdminRiders: "getAdminRidersClient",
  getDeliveryPerformance: "getDeliveryPerformanceClient",
  assignDelivery: "assignDeliveryClient",
  getAdminBlogPosts: "getAdminBlogPostsClient",
  deleteAdminBlogPost: "deleteAdminBlogPostClient",
  getAdminProducts: "getAdminProductsClient",
  deleteAdminProduct: "deleteAdminProductClient",
  setProductPlacements: "setProductPlacementsClient",
  adminListCoupons: "adminListCouponsClient",
  adminDeleteCoupon: "adminDeleteCouponClient",
  getAdminCategories: "getAdminCategoriesClient",
  deleteAdminCategory: "deleteAdminCategoryClient",
  adminListBrands: "adminListBrandsClient",
  adminDeleteBrand: "adminDeleteBrandClient",
  getAdminBanners: "getAdminBannersClient",
  deleteAdminBanner: "deleteAdminBannerClient",
  toggleAdminBanner: "toggleAdminBannerClient",
  saveAdminProduct: "saveAdminProductClient",
  createAdminUser: "createAdminUserClient",
  getAdminCustomers: "getAdminCustomersClient",
  createAdminOrder: "createAdminOrderClient",
  saveAdminBanner: "saveAdminBannerClient",
  saveAdminRider: "saveAdminRiderClient",
  saveAdminStore: "saveAdminStoreClient",
  saveAdminBlogPost: "saveAdminBlogPostClient",
  adminSaveCoupon: "adminSaveCouponClient",
  adminSaveBrand: "adminSaveBrandClient",
  saveAdminCategory: "saveAdminCategoryClient",
  getAdminBOGO: "getAdminBOGOClient",
  getAdminCategoryDiscounts: "getAdminCategoryDiscountsClient",
  adminListReturns: "adminListReturnsClient",
  adminSetReturnStatus: "adminSetReturnStatusClient",
  processAdminRefund: "processAdminRefundClient",
  getAdminActivityLogs: "getAdminActivityLogsClient",
  getAdminPayments: "getAdminPaymentsClient",
  adminBroadcastNotification: "adminBroadcastNotificationClient",
  getAdminSalesReport: "getAdminSalesReportClient",
  getAdminCustomerDetail: "getAdminCustomerDetailClient",
  getAdminDashboard: "getAdminDashboardClient",
  adminListReviews: "adminListReviewsClient",
  adminSetReviewApproval: "adminSetReviewApprovalClient",
  adminDeleteReview: "adminDeleteReviewClient",
  adminListSettings: "adminListSettingsClient",
  adminSaveSettings: "adminSaveSettingsClient",
};

const moduleMap = {
  getAdminTickets: "@/lib/admin-platform.functions",
  updateAdminTicket: "@/lib/admin-platform.functions",
  getAdminRiders: "@/lib/admin-platform.functions",
  getDeliveryPerformance: "@/lib/admin-platform.functions",
  assignDelivery: "@/lib/admin-platform.functions",
  getAdminPayments: "@/lib/admin-platform.functions",
  processAdminRefund: "@/lib/admin-platform.functions",
  getAdminBOGO: "@/lib/admin-platform.functions",
  getAdminCategoryDiscounts: "@/lib/admin-platform.functions",
  getAdminActivityLogs: "@/lib/admin-platform.functions",
  getAdminUsers: "@/lib/admin-ops.functions",
  setUserVerification: "@/lib/admin-ops.functions",
  deleteAdminUser: "@/lib/admin-ops.functions",
  createAdminUser: "@/lib/admin-ops.functions",
  setOrderDelivery: "@/lib/admin-ops.functions",
  getAdminBlogPosts: "@/lib/admin-ops.functions",
  saveAdminBlogPost: "@/lib/admin-ops.functions",
  deleteAdminBlogPost: "@/lib/admin-ops.functions",
  getAdminSalesReport: "@/lib/admin-ops.functions",
  adminListBrands: "@/lib/admin-extra.functions",
  adminSaveBrand: "@/lib/admin-extra.functions",
  adminDeleteBrand: "@/lib/admin-extra.functions",
  adminListCoupons: "@/lib/admin-extra.functions",
  adminSaveCoupon: "@/lib/admin-extra.functions",
  adminDeleteCoupon: "@/lib/admin-extra.functions",
  adminListReviews: "@/lib/admin-extra.functions",
  adminSetReviewApproval: "@/lib/admin-extra.functions",
  adminDeleteReview: "@/lib/admin-extra.functions",
  adminListReturns: "@/lib/admin-extra.functions",
  adminSetReturnStatus: "@/lib/admin-extra.functions",
  adminListSettings: "@/lib/admin-extra.functions",
  adminSaveSettings: "@/lib/admin-extra.functions",
  adminBroadcastNotification: "@/lib/admin-extra.functions",
};

const files = [
  "routes/admin/tickets.tsx",
  "routes/admin/orders/index.tsx",
  "routes/admin/users/index.tsx",
  "routes/admin/users/$id.tsx",
  "routes/admin/stores/index.tsx",
  "routes/admin/delivery/index.tsx",
  "routes/admin/blog/index.tsx",
  "routes/admin/products/index.tsx",
  "routes/admin/coupons/index.tsx",
  "routes/admin/categories/index.tsx",
  "routes/admin/brands/index.tsx",
  "routes/admin/banners/index.tsx",
  "routes/admin/products/$id.tsx",
  "routes/admin/products/new.tsx",
  "routes/admin/orders/$id.tsx",
  "routes/admin/users/new.tsx",
  "routes/admin/orders/new.tsx",
  "routes/admin/banners/$id.tsx",
  "routes/admin/banners/new.tsx",
  "routes/admin/delivery/new.tsx",
  "routes/admin/stores/$id.tsx",
  "routes/admin/stores/new.tsx",
  "routes/admin/blog/$id.tsx",
  "routes/admin/blog/new.tsx",
  "routes/admin/coupons/$id.tsx",
  "routes/admin/coupons/new.tsx",
  "routes/admin/brands/$id.tsx",
  "routes/admin/brands/new.tsx",
  "routes/admin/categories/$id.tsx",
  "routes/admin/categories/new.tsx",
  "routes/admin/promotions.tsx",
  "routes/admin/returns.tsx",
  "routes/admin/audit-logs.tsx",
  "routes/admin/payments.tsx",
  "routes/admin/notifications.tsx",
  "routes/admin/reports.tsx",
  "routes/admin/customer.$id.tsx",
  "routes/admin/index.tsx",
  "routes/admin/reviews.tsx",
  "routes/admin/settings.tsx",
  "routes/admin/customers.tsx",
  "components/admin-banner-form.tsx",
];

for (const rel of files) {
  const file = path.join(root, rel);
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("useServerFn")) continue;

  const usedFns = Object.keys(clientMap).filter((fn) => content.includes(`useServerFn(${fn})`));

  content = content.replace(
    /import \{ useServerFn \} from "@tanstack\/react-start";\n?/,
    "import { useAdminFn } from \"@/hooks/use-admin-fn\";\n",
  );

  for (const fn of usedFns) {
    const client = clientMap[fn];
    const mod = moduleMap[fn] || "@/lib/admin.functions";
    const importRe = new RegExp(`import \\{([^}]+)\\} from "${mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
    const m = content.match(importRe);
    if (m) {
      const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (!names.includes(client)) names.push(client);
      content = content.replace(importRe, `import { ${names.join(", ")} } from "${mod}"`);
    }
  }

  for (const fn of usedFns) {
    content = content.replaceAll(`useServerFn(${fn})`, `useAdminFn(${fn}, ${clientMap[fn]})`);
  }

  fs.writeFileSync(file, content);
  console.log("updated", rel, usedFns.length);
}
