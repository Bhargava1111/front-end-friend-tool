import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import {
  getAdminUsersClient,
  setUserVerificationClient,
  deleteAdminUserClient,
  manageAdminUserClient,
} from "@/lib/admin-client.functions";
import { toast } from "sonner";
import {
  BadgeCheck,
  Ban,
  ChevronRight,
  Eye,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import {
  getAdminUsers,
  setUserVerification,
  deleteAdminUser,
} from "@/lib/admin-ops.functions";
import { manageAdminUser } from "@/lib/admin-platform.functions";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [
      { title: "Users — Admin | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Search shoppers, verify accounts, view orders and spend.",
      },
      { property: "og:title", content: "Users — Admin" },
      { property: "og:description", content: "Verify, reject, add or remove app users." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsers,
});

type AdminUserRow = {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  avatar_url?: string;
  gst_number?: string;
  alt_phone?: string;
  verification_status?: string;
  address_text?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_m?: number | null;
  rejection_reason?: string;
  created_at?: string;
  order_count?: number;
  total_spend?: number;
};

const TABS = ["all", "submitted", "pending", "verified", "rejected", "blocked"] as const;
type Tab = (typeof TABS)[number];

const STATUS_LABEL: Record<string, string> = {
  pending: "Not submitted",
  submitted: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

const BADGES: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  submitted: "bg-accent/20 text-accent-foreground",
  verified: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function AdminUsers() {
  const qc = useQueryClient();
  const fetchUsers = useAdminFn(getAdminUsers, getAdminUsersClient);
  const setStatus = useAdminFn(setUserVerification, setUserVerificationClient);
  const remove = useAdminFn(deleteAdminUser, deleteAdminUserClient);
  const manageUser = useAdminFn(manageAdminUser, manageAdminUserClient);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers({ data: {} }) as Promise<AdminUserRow[]>,
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

  const blockMutation = useMutation({
    mutationFn: (vars: { userId: string; is_active: boolean }) =>
      manageUser({ data: { id: vars.userId, is_active: vars.is_active } }),
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "User unblocked" : "User blocked");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => remove({ data: { id: userId } }),
    onSuccess: () => {
      toast.success("User removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();

  const stats = useMemo(() => {
    const pending = data.filter((u) => u.verification_status === "submitted").length;
    const verified = data.filter((u) => u.verification_status === "verified").length;
    const blocked = data.filter((u) => u.is_active === false).length;
    return { total: data.length, pending, verified, blocked };
  }, [data]);

  const rows = useMemo(() => {
    let list = data;
    if (tab === "blocked") {
      list = list.filter((u) => u.is_active === false);
    } else if (tab !== "all") {
      list = list.filter((u) => (u.verification_status ?? "pending") === tab);
    }
    if (!term) return list;
    return list.filter((u) => {
      const blob = [
        u.full_name,
        u.phone,
        u.email,
        u.gst_number,
        u.pincode,
        u.address_text,
        u.alt_phone,
        u.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(term);
    });
  }, [data, tab, term]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Users</h1>
          <p className="text-xs text-muted-foreground">
            Search, verify and manage shopper accounts
          </p>
        </div>
        <Button className="shrink-0 gap-2" asChild>
          <Link to="/admin/users/new">
            <Plus className="h-4 w-4" /> Add user
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total users", value: stats.total, icon: Users },
          { label: "Pending review", value: stats.pending, icon: BadgeCheck },
          { label: "Verified", value: stats.verified, icon: BadgeCheck },
          { label: "Blocked", value: stats.blocked, icon: Ban },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email, GST, pincode, address…"
            className="pl-9"
            aria-label="Search users"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {data.length} users
      </p>

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
          No users match your search.
        </p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="hidden px-4 py-3 sm:table-cell">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Orders</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Spend</th>
                <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => {
                const status = u.verification_status ?? "pending";
                const blocked = u.is_active === false;
                return (
                  <tr key={u.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/users/$id"
                        params={{ id: u.id }}
                        className="flex min-w-0 items-center gap-2 hover:underline"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                            {(u.full_name ?? "U").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {u.full_name ?? "Unnamed shopper"}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {u.email ?? u.phone ?? "—"}
                          </span>
                          {u.gst_number && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              GST: {u.gst_number}
                            </span>
                          )}
                          {u.address_text && (
                            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                              {u.address_text}
                              {u.pincode ? ` · ${u.pincode}` : ""}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                            BADGES[status] ?? BADGES.pending,
                          )}
                        >
                          {STATUS_LABEL[status] ?? status}
                        </span>
                        {blocked && (
                          <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">{u.order_count ?? 0}</td>
                    <td className="hidden px-4 py-3 text-right font-medium md:table-cell">
                      {formatINR(u.total_spend ?? 0)}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                          <Link to="/admin/users/$id" params={{ id: u.id }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {u.latitude != null && u.longitude != null && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                            <a
                              href={`https://www.google.com/maps?q=${u.latitude},${u.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open map"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                          <Link to="/admin/orders" search={{ customer: u.id }}>
                            <ShoppingBag className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {status !== "verified" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ userId: u.id, status: "verified" })}
                            aria-label="Verify"
                          >
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                userId: u.id,
                                status: "rejected",
                                reason: "Address or location could not be confirmed",
                              })
                            }
                            aria-label="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          disabled={blockMutation.isPending}
                          onClick={() => blockMutation.mutate({ userId: u.id, is_active: blocked })}
                          aria-label={blocked ? "Unblock" : "Block"}
                        >
                          {blocked ? <Unlock className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("Remove this user permanently?")) deleteMutation.mutate(u.id);
                          }}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
