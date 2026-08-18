import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { getAdminStores, saveAdminStore } from "@/lib/admin.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { StoreLocation } from "@/lib/geo";

export const Route = createFileRoute("/admin/stores/$id")({
  component: EditStore,
});

type Form = {
  id: string;
  name: string;
  address_text: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  phone: string;
  opening_hours: string;
  delivery_radius_km: string;
  is_active: boolean;
};

function EditStore() {
  const { id } = useParams({ from: "/admin/stores/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchStores = useServerFn(getAdminStores);
  const save = useServerFn(saveAdminStore);
  const [form, setForm] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fetchStores() as Promise<StoreLocation[]>,
  });

  const store = data.find((s) => s.id === id);

  useEffect(() => {
    if (store) {
      setForm({
        id: store.id,
        name: store.name,
        address_text: store.address_text,
        city: store.city,
        state: store.state,
        pincode: store.pincode,
        latitude: String(store.latitude),
        longitude: String(store.longitude),
        phone: store.phone ?? "",
        opening_hours: store.opening_hours,
        delivery_radius_km: String(store.delivery_radius_km),
        is_active: store.is_active,
      });
    }
  }, [store]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
    qc.invalidateQueries({ queryKey: ["stores"] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: Form) =>
      save({
        data: {
          id: f.id,
          name: f.name,
          address_text: f.address_text,
          city: f.city,
          state: f.state,
          pincode: f.pincode,
          latitude: Number(f.latitude),
          longitude: Number(f.longitude),
          phone: f.phone || null,
          opening_hours: f.opening_hours,
          delivery_radius_km: Number(f.delivery_radius_km),
          is_active: f.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Store saved");
      invalidate();
      navigate({ to: "/admin/stores" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!store) {
    return (
      <AdminFormShell backTo="/admin/stores" backLabel="Back to stores" title="Store not found">
        <p className="text-sm text-muted-foreground">This store does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell backTo="/admin/stores" backLabel="Back to stores" title="Edit store">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate(form);
        }}
      >
        {(
          [
            ["name", "Store name"],
            ["address_text", "Address"],
            ["city", "City"],
            ["state", "State"],
            ["pincode", "Pincode"],
            ["phone", "Phone"],
            ["opening_hours", "Opening hours"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={`s-${key}`}>{label}</Label>
            <Input
              id={`s-${key}`}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="s-lat">Latitude</Label>
            <Input
              id="s-lat"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="s-lng">Longitude</Label>
            <Input
              id="s-lng"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="s-rad">Radius (km)</Label>
            <Input
              id="s-rad"
              value={form.delivery_radius_km}
              onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          onClick={() => {
            if (!navigator.geolocation) return toast.error("Location unavailable");
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        latitude: pos.coords.latitude.toFixed(6),
                        longitude: pos.coords.longitude.toFixed(6),
                      }
                    : f,
                ),
              () => toast.error("Couldn't read your location"),
            );
          }}
        >
          <LocateFixed className="h-4 w-4" /> Use current coordinates
        </Button>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm({ ...form, is_active: v })}
          />
          Active &amp; visible to customers
        </label>

        <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save store"}
        </Button>
      </form>
    </AdminFormShell>
  );
}
