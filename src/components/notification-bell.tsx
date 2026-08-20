import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { fetchNotificationsClient } from "@/lib/notifications.functions";
import { AUTH_CLEARED_EVENT } from "@/lib/auth-store";
import { useSession } from "@/hooks/use-shop";
import { cn } from "@/lib/utils";

export function useNotifications() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data = [], isError, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotificationsClient(),
    enabled: !!session,
    refetchInterval: session?.user?.role === "admin" ? 5_000 : 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, 30_000);
    const onCleared = () => queryClient.removeQueries({ queryKey: ["notifications"] });
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);
    return () => {
      clearInterval(id);
      window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
    };
  }, [session, queryClient]);

  return { data: isError ? [] : (data ?? []), isError, isLoading, refetch };
}

export function NotificationBell({ className }: { className?: string }) {
  const { session } = useSession();
  const { data = [], isError } = useNotifications();
  const unread = data.filter((n) => !n.is_read).length;

  return (
    <Link
      to={session ? "/notifications" : "/auth"}
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      className={cn("relative grid h-9 w-9 place-items-center rounded-full", className)}
    >
      <Bell className="h-4.5 w-4.5" />
      {session && !isError && unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
