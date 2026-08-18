import type { AppNotification } from "@/lib/notifications.functions";

export type NotificationNavTarget =
  | { to: "/orders/$id"; params: { id: string } }
  | { to: "/admin/orders/$id"; params: { id: string } }
  | { to: "/support" }
  | { to: "/offers" }
  | { to: "/coupons" }
  | { to: "/deals" }
  | { to: "/admin/tickets" }
  | { to: "/notifications" }
  | { to: string; params?: Record<string, string> };

/** Parse an app path into a TanStack Router navigation target. */
export function parseNotificationPath(path: string): NotificationNavTarget {
  const clean = path.split("?")[0] ?? path;

  const adminOrder = clean.match(/^\/admin\/orders\/([^/]+)/);
  if (adminOrder?.[1]) return { to: "/admin/orders/$id", params: { id: adminOrder[1] } };

  const customerOrder = clean.match(/^\/orders\/([^/]+)/);
  if (customerOrder?.[1]) return { to: "/orders/$id", params: { id: customerOrder[1] } };

  const staticRoutes = [
    "/support",
    "/offers",
    "/coupons",
    "/deals",
    "/notifications",
    "/admin/tickets",
    "/help",
    "/contact",
  ] as const;

  if ((staticRoutes as readonly string[]).includes(clean)) {
    return { to: clean as NotificationNavTarget["to"] };
  }

  return { to: clean };
}

/** Resolve where a notification should navigate when clicked. */
export function resolveNotificationNavigation(
  notification: AppNotification,
  userRole?: string | null,
): NotificationNavTarget | null {
  if (notification.link) {
    return parseNotificationPath(notification.link);
  }

  if (notification.order_id) {
    if (notification.type === "admin_order" && userRole === "admin") {
      return { to: "/admin/orders/$id", params: { id: notification.order_id } };
    }
    if (notification.type === "order" || notification.order_id) {
      return { to: "/orders/$id", params: { id: notification.order_id } };
    }
    if (userRole === "admin" && notification.title.toLowerCase().includes("new order")) {
      return { to: "/admin/orders/$id", params: { id: notification.order_id } };
    }
  }

  const title = notification.title.toLowerCase();

  if (title.startsWith("reply:") || title.includes("support ticket") || title.includes("ticket update")) {
    return { to: "/support" };
  }

  if (notification.type === "promo" || title.includes("offer") || title.includes("coupon")) {
    return { to: "/offers" };
  }

  if (userRole === "admin" && (title.includes("new support") || title.includes("support ticket"))) {
    return { to: "/admin/tickets" };
  }

  if (notification.type === "system" && notification.body) {
    return { to: "/notifications" };
  }

  return null;
}

/** @deprecated Use resolveNotificationNavigation */
export function getNotificationLink(
  notification: AppNotification,
  userRole?: string | null,
): string | null {
  const target = resolveNotificationNavigation(notification, userRole);
  if (!target) return null;
  if ("params" in target && target.params?.id) {
    return target.to.replace("$id", target.params.id);
  }
  return target.to;
}
