import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-shop";
import { subscribeToPushNotifications } from "@/lib/push-notifications";

import { navigateFromNotificationUrl } from "@/lib/notification-navigate";

/** Silently registers push when the user already granted browser permission. */
export function PushNotifications() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    void subscribeToPushNotifications();
  }, [session?.access]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const onMessage = (event: MessageEvent) => {
      const url = event.data?.url as string | undefined;
      if (event.data?.type === "NOTIFICATION_NAVIGATE" && url) {
        navigateFromNotificationUrl(router, url);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
