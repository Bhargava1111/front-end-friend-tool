import { useRouter } from "@tanstack/react-router";
import type { AppNotification } from "@/lib/notifications.functions";
import { parseNotificationPath, resolveNotificationNavigation } from "@/lib/notification-routing";

export function useNotificationNavigator() {
  const router = useRouter();

  return (notification: AppNotification, userRole?: string | null) => {
    const target = resolveNotificationNavigation(notification, userRole);
    if (!target) return false;
    void router.navigate(target as Parameters<typeof router.navigate>[0]);
    return true;
  };
}

export function navigateFromNotificationUrl(
  router: ReturnType<typeof useRouter>,
  url: string,
) {
  void router.navigate(parseNotificationPath(url) as Parameters<typeof router.navigate>[0]);
}
