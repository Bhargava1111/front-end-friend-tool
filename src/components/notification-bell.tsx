import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getNotifications, type AppNotification } from "@/lib/notifications.functions";
import { useSession } from "@/hooks/use-shop";
import { cn } from "@/lib/utils";

export function useNotifications() {
  const { session } = useSession();
  const fetchNotifications = useServerFn(getNotifications);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications() as Promise<AppNotification[]>,
    enabled: !!session,
  });

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, queryClient]);

  return query;
}

export function NotificationBell({ className }: { className?: string }) {
  const { data = [] } = useNotifications();
  const unread = data.filter((n) => !n.is_read).length;

  return (
    <Link
      to="/notifications"
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      className={cn("relative grid h-9 w-9 place-items-center rounded-full", className)}
    >
      <Bell className="h-4.5 w-4.5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
