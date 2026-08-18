import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/components/notification-bell";
import { useSession } from "@/hooks/use-shop";
import { resolveNotificationNavigation } from "@/lib/notification-routing";
import { playAdminOrderAlarm, stopAdminOrderAlarm } from "@/lib/notification-sound";
import { Button } from "@/components/ui/button";

/** Plays a repeating alarm when admins receive new order notifications. */
export function AdminNotificationAlerts() {
  const router = useRouter();
  const { user } = useSession();
  const { data: notifications = [] } = useNotifications();
  const seenRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const [alarmBanner, setAlarmBanner] = useState<{
    title: string;
    body: string;
    orderId?: string | null;
  } | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      bootstrappedRef.current = false;
      seenRef.current.clear();
      stopAdminOrderAlarm();
      setAlarmBanner(null);
      return;
    }

    // Browser may block sound until the user interacts once — request desktop permission early.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const adminAlerts = notifications.filter(
      (n) => n.type === "admin_order" || n.title.toLowerCase().includes("new order"),
    );

    if (!bootstrappedRef.current) {
      adminAlerts.forEach((n) => seenRef.current.add(n.id));
      bootstrappedRef.current = true;
      return;
    }

    const fresh = adminAlerts.filter((n) => !n.is_read && !seenRef.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => seenRef.current.add(n.id));

    const latest = fresh[0];
    playAdminOrderAlarm(45_000);
    setAlarmBanner({
      title: latest.title || "New order",
      body: latest.body || "A customer placed a new order.",
      orderId: latest.order_id,
    });
    toast.error(`${latest.title}: ${latest.body ?? "Open orders now"}`, {
      duration: 12_000,
      id: `admin-order-alarm-${latest.id}`,
    });

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const desktopAlert = new Notification(latest.title, {
        body: latest.body ?? "New order received",
        tag: `admin-order-${latest.id}`,
        requireInteraction: true,
      });
      desktopAlert.onclick = () => {
        window.focus();
        stopAdminOrderAlarm();
        setAlarmBanner(null);
        if (latest.order_id) {
          void router.navigate({ to: "/admin/orders/$id", params: { id: latest.order_id } });
        } else {
          const target = resolveNotificationNavigation(latest, "admin");
          if (target) void router.navigate(target as never);
          else void router.navigate({ to: "/admin/orders" });
        }
        desktopAlert.close();
      };
    }
  }, [notifications, isAdmin, router]);

  if (!alarmBanner) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto sm:w-[22rem]">
      <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-600 px-4 py-3 text-white shadow-2xl">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
          <BellRing className="h-5 w-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{alarmBanner.title}</p>
          <p className="mt-0.5 text-xs text-white/90">{alarmBanner.body}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 bg-white text-red-700 hover:bg-white/90"
              onClick={() => {
                stopAdminOrderAlarm();
                setAlarmBanner(null);
                if (alarmBanner.orderId) {
                  void router.navigate({
                    to: "/admin/orders/$id",
                    params: { id: alarmBanner.orderId },
                  });
                } else {
                  void router.navigate({ to: "/admin/orders" });
                }
              }}
            >
              Open order
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-white hover:bg-white/15 hover:text-white"
              onClick={() => {
                stopAdminOrderAlarm();
                setAlarmBanner(null);
              }}
            >
              Stop alarm
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss alarm"
          className="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white"
          onClick={() => {
            stopAdminOrderAlarm();
            setAlarmBanner(null);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
