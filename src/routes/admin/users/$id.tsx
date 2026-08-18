import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminUsers, setUserVerification } from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/format";
import { AdminFormShell } from "@/components/admin-form-shell";
import { StoreMap } from "@/components/store-map";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { useStores } from "@/components/location-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/$id")({
  component: UserDetail,
});

const BADGES: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  submitted: "bg-accent/20 text-accent-foreground",
  verified: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function UserDetail() {
  const { id } = useParams({ from: "/admin/users/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(getAdminUsers);
  const setStatus = useServerFn(setUserVerification);
  const [rejectReason, setRejectReason] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const user = data.find((u) => u.id === id);
  const status = user?.verification_status ?? "pending";
  const { data: stores = [] } = useStores();
  const { data: resolvedPlace } = useReverseGeocode(user?.latitude, user?.longitude);

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
      navigate({ to: "/admin/users" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!user) {
    return (
      <AdminFormShell backTo="/admin/users" backLabel="Back to users" title="User not found">
        <p className="text-sm text-muted-foreground">This user does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell
      backTo="/admin/users"
      backLabel="Back to users"
      title={user.full_name ?? "Unnamed shopper"}
    >
      <div className="space-y-4">
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
            BADGES[status] ?? BADGES.pending,
          )}
        >
          {status}
        </span>

        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium text-foreground">{user.phone ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="text-foreground">{formatDate(user.created_at)}</dd>
          </div>
          {user.submitted_at && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="text-foreground">{formatDate(user.submitted_at)}</dd>
            </div>
          )}
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-foreground">
              {user.address_text || "—"}
              {user.pincode ? ` — ${user.pincode}` : ""}
            </dd>
          </div>
          {user.latitude != null && user.longitude != null && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="space-y-2">
                {resolvedPlace && (
                  <p className="font-medium text-foreground">{resolvedPlace.label}</p>
                )}
                {resolvedPlace?.detail && (
                  <p className="text-xs text-muted-foreground">{resolvedPlace.detail}</p>
                )}
                <a
                  href={`https://www.google.com/maps?q=${user.latitude},${user.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {user.latitude.toFixed(5)}, {user.longitude.toFixed(5)}
                  {user.location_accuracy_m != null
                    ? ` · ±${Math.round(user.location_accuracy_m)} m`
                    : ""}
                </a>
                <StoreMap
                  stores={stores}
                  center={{ lat: user.latitude, lng: user.longitude }}
                  className="h-48"
                />
              </dd>
            </div>
          )}
          {user.rejection_reason && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-muted-foreground">Rejection</dt>
              <dd className="text-destructive">{user.rejection_reason}</dd>
            </div>
          )}
        </dl>

        {status !== "verified" && status !== "rejected" && (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="reject-reason">Rejection reason (optional)</Label>
            <Textarea
              id="reject-reason"
              rows={2}
              placeholder="Address or location could not be confirmed"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {status !== "verified" && (
            <Button
              className="gap-1.5"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ userId: user.id, status: "verified" })}
            >
              <BadgeCheck className="h-4 w-4" /> Verify
            </Button>
          )}
          {status !== "rejected" && (
            <Button
              variant="outline"
              className="gap-1.5 border-destructive/40 text-destructive"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  userId: user.id,
                  status: "rejected",
                  reason: rejectReason.trim() || "Address or location could not be confirmed",
                })
              }
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </div>
    </AdminFormShell>
  );
}
