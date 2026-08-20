import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { useNotifications } from "@/components/notification-bell";
import { useSession } from "@/hooks/use-shop";
import {
  clearNotificationsClient,
  markNotificationsReadClient,
} from "@/lib/notifications.functions";
import { formatDateTime } from "@/lib/format";
import { isPushSupported, pushSubscribeErrorMessage, subscribeToPushNotifications } from "@/lib/push-notifications";
import { useNotificationNavigator } from "@/lib/notification-navigate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Sri Mahalakshmi Stores" },
      { name: "description", content: "Order approvals, delivery updates and store alerts." },
      { property: "og:title", content: "Notifications — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Stay updated on your orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { session, user } = useSession();
  const navigateNotification = useNotificationNavigator();
  const { data = [], isLoading, isError, refetch } = useNotifications();
  const [pushBusy, setPushBusy] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  async function enablePush() {
    setPushBusy(true);
    try {
      const result = await subscribeToPushNotifications({ requestPermission: true });
      if (result === "granted") toast.success("Push notifications enabled");
      else toast.error(pushSubscribeErrorMessage(result));
    } finally {
      setPushBusy(false);
    }
  }

  const readMutation = useMutation({
    mutationFn: (id?: string) => markNotificationsReadClient({ id }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearNotificationsClient(),
    onSuccess: () => {
      toast.success("Notifications cleared");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = data.filter((n) => !n.is_read).length;

  return (
    <PageShell>
      <TopBar title="Notifications" backTo="/" />

      {session && isPushSupported() && Notification.permission !== "granted" && (
        <div className="mx-4 mt-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
          <p className="text-sm font-semibold text-foreground">Get alerts on this device</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enable push notifications for order updates and store offers.
          </p>
          <Button className="mt-3 h-10 rounded-xl" size="sm" disabled={pushBusy} onClick={() => void enablePush()}>
            {pushBusy ? "Enabling…" : "Enable push notifications"}
          </Button>
        </div>
      )}

      {!session && (
        <div className="mx-4 mt-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Sign in to see your notifications.</p>
          <Button asChild className="mt-3 rounded-xl" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {isError && (
        <div className="mx-4 mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-semibold text-foreground">Could not load notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button className="mt-3 rounded-xl" size="sm" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {data.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-xs text-muted-foreground">
            {unread ? `${unread} unread` : "You're all caught up"}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              disabled={!unread || readMutation.isPending}
              onClick={() => readMutation.mutate(undefined)}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-destructive"
              onClick={() => clearMutation.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : !session || isError ? null : data.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-8 w-8" />}
          title="No notifications yet"
          description="Order approvals and delivery updates will appear here."
        />
      ) : (
        <div className="space-y-2.5 p-4">
          {data.map((n) => {
            const content = (
              <>
                {n.image_url && (
                  <img
                    src={n.image_url}
                    alt=""
                    className="mb-3 w-full rounded-xl object-cover aspect-[16/7]"
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </div>
                {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </>
            );
            const className = cn(
              "block w-full rounded-2xl border p-4 text-left transition-colors hover:bg-secondary/40",
              n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary-soft/40",
            );
            const onOpen = () => {
              if (!n.is_read) readMutation.mutate(n.id);
              const opened = navigateNotification(n, user?.role);
              if (!opened) toast.message("Notification", { description: n.body ?? n.title });
            };

            return (
              <button key={n.id} type="button" onClick={onOpen} className={className}>
                {content}
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
