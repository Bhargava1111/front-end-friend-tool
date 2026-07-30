import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { useNotifications } from "@/components/notification-bell";
import { clearNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import { formatDate } from "@/lib/format";
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
  const { data = [], isLoading } = useNotifications();
  const markRead = useServerFn(markNotificationsRead);
  const clearAll = useServerFn(clearNotifications);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const readMutation = useMutation({
    mutationFn: (id?: string) => markRead({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearAll(),
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
      ) : data.length === 0 ? (
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
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </div>
                {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(n.created_at)}</p>
              </>
            );
            const className = cn(
              "block w-full rounded-2xl border p-4 text-left transition-colors",
              n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary-soft/40",
            );
            return n.order_id ? (
              <Link
                key={n.id}
                to="/orders/$id"
                params={{ id: n.order_id }}
                onClick={() => !n.is_read && readMutation.mutate(n.id)}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.is_read && readMutation.mutate(n.id)}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
