import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Eye, MapPin, Plus, Trash2, X } from "lucide-react";
import { getAdminUsers, setUserVerification, deleteAdminUser } from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [
      { title: "User Verification — Admin | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Approve new shoppers after checking their phone, address and captured location.",
      },
      { property: "og:title", content: "User Verification — Admin" },
      { property: "og:description", content: "Verify, reject, add or remove app users." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsers,
});

const TABS = ["submitted", "pending", "verified", "rejected", "all"] as const;
type Tab = (typeof TABS)[number];

const BADGES: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  submitted: "bg-accent/20 text-accent-foreground",
  verified: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function AdminUsers() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(getAdminUsers);
  const setStatus = useServerFn(setUserVerification);
  const remove = useServerFn(deleteAdminUser);
  const [tab, setTab] = useState<Tab>("all");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
  };

  const statusMutation = useMutation({
    mutationFn: (vars: { userId: string; status: "verified" | "rejected" | "pending"; reason?: string }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("User updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("User removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = tab === "all" ? data : data.filter((u) => (u.verification_status ?? "pending") === tab);
  const pendingCount = data.filter((u) => u.verification_status === "submitted").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">Users</h1>
          <p className="text-xs text-muted-foreground">
            {pendingCount
              ? `${pendingCount} awaiting verification`
              : "No verification requests pending"}
          </p>
        </div>
        <Button className="shrink-0 gap-2" asChild>
          <Link to="/admin/users/new">
            <Plus className="h-4 w-4" /> Add user
          </Link>
        </Button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize",
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Could not load users</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message ?? "Admin session may have expired."}
          </p>
          <Button className="mt-4 rounded-xl" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No users in this view.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((u) => {
          const status = u.verification_status ?? "pending";
          return (
            <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.full_name ?? "Unnamed shopper"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.phone ?? "No phone"} · joined {formatDate(u.created_at)}
                  </p>
                  {u.address_text && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u.address_text}
                      {u.pincode ? ` — ${u.pincode}` : ""}
                    </p>
                  )}
                  {u.latitude != null && u.longitude != null && (
                    <a
                      href={`https://www.google.com/maps?q=${u.latitude},${u.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Check pin ({u.latitude.toFixed(5)}, {u.longitude.toFixed(5)})
                      {u.location_accuracy_m != null
                        ? ` · ±${Math.round(u.location_accuracy_m)} m`
                        : ""}
                    </a>
                  )}
                  {u.rejection_reason && (
                    <p className="mt-1 text-xs text-destructive">Rejected: {u.rejection_reason}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                    BADGES[status] ?? BADGES.pending,
                  )}
                >
                  {status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button size="sm" variant="secondary" className="h-9 gap-1.5 text-xs" asChild>
                  <Link to="/admin/users/$id" params={{ id: u.id }}>
                    <Eye className="h-3.5 w-3.5" /> View details
                  </Link>
                </Button>
                {status !== "verified" && (
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ userId: u.id, status: "verified" })}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Verify
                  </Button>
                )}
                {status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 border-destructive/40 text-xs text-destructive"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        userId: u.id,
                        status: "rejected",
                        reason: "Address or location could not be confirmed",
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-9 gap-1.5 text-xs text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm("Remove this user permanently?")) deleteMutation.mutate(u.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
