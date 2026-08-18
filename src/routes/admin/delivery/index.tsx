import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  assignDelivery,
  getAdminRiders,
  getDeliveryPerformance,
} from "@/lib/admin-platform.functions";
import { getAdminOrders } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/admin/delivery/")({
  component: AdminDelivery,
});

function AdminDelivery() {
  const qc = useQueryClient();
  const fetchRiders = useServerFn(getAdminRiders);
  const fetchOrders = useServerFn(getAdminOrders);
  const fetchPerf = useServerFn(getDeliveryPerformance);
  const assign = useServerFn(assignDelivery);
  const [assignOrder, setAssignOrder] = useState("");
  const [assignRider, setAssignRider] = useState("");

  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: () => fetchRiders() as Promise<Array<Record<string, unknown>>>,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders() as Promise<Array<{ id: string; order_number: string; status: string }>>,
  });
  const { data: perf } = useQuery({
    queryKey: ["delivery-perf"],
    queryFn: () => fetchPerf() as Promise<{ riders: Array<Record<string, unknown>>; delivered_count: number }>,
  });

  const assignMutation = useMutation({
    mutationFn: () => assign({ data: { order_id: assignOrder, rider_id: assignRider } }),
    onSuccess: () => toast.success("Rider assigned"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Delivery management</h1>
        <Button size="sm" className="gap-1" asChild>
          <Link to="/admin/delivery/new">
            <Plus className="h-4 w-4" /> Add rider
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-2xl font-bold">{perf?.delivered_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active riders</p>
          <p className="text-2xl font-bold">{riders.filter((r) => r.is_active).length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Assign rider to order</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Select value={assignOrder} onValueChange={setAssignOrder}>
            <SelectTrigger>
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              {orders
                .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
                .map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={assignRider} onValueChange={setAssignRider}>
            <SelectTrigger>
              <SelectValue placeholder="Select rider" />
            </SelectTrigger>
            <SelectContent>
              {riders.map((r) => (
                <SelectItem key={String(r.id)} value={String(r.id)}>
                  {String(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => assignMutation.mutate()} disabled={!assignOrder || !assignRider}>
            Assign
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {riders.map((r) => (
          <div key={String(r.id)} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm">
            <div>
              <p className="font-semibold">{String(r.name)}</p>
              <p className="text-xs text-muted-foreground">
                {String(r.phone)} · {String(r.total_deliveries)} deliveries · ★ {Number(r.rating).toFixed(1)}
              </p>
            </div>
            {r.latitude != null && (
              <span className="text-[11px] text-muted-foreground">
                GPS {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
