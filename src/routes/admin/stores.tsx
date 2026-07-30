import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { getAdminStores, saveAdminStore, deleteAdminStore } from "@/lib/admin.functions";
import { StoreMap } from "@/components/store-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StoreLocation } from "@/lib/geo";

export const Route = createFileRoute("/admin/stores")({
  head: () => ({
    meta: [
      { title: "Store Locations — Admin | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Manage outlet coordinates, delivery radius and opening hours on the map.",
      },
      { property: "og:title", content: "Store Locations — Admin" },
      { property: "og:description", content: "Map-based management of outlets and delivery areas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminStores,
});

type Form = {
  id?: string;
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

const empty: Form = {
  name: "",
  address_text: "",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "",
  latitude: "13.0418",
  longitude: "80.2341",
  phone: "",
  opening_hours: "7:00 AM - 10:00 PM",
  delivery_radius_km: "5",
  is_active: true,
};

function AdminStores() {
  const qc = useQueryClient();
  const fetchStores = useServerFn(getAdminStores);
  const save = useServerFn(saveAdminStore);
  const remove = useServerFn(deleteAdminStore);
  const [form, setForm] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fetchStores() as Promise<StoreLocation[]>,
  });

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
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Store removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <StoreMap stores={data} className="h-64" />

      <div className="flex justify-end">
        <Button onClick={() => setForm(empty)} className="gap-2">
          <Plus className="h-4 w-4" /> New store
        </Button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      <div className="grid gap-3 md:grid-cols-2">
        {data.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.address_text}, {s.city} {s.pincode}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)} · {s.delivery_radius_km} km
                  radius · {s.opening_hours}
                </p>
                {!s.is_active && (
                  <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${s.name}`}
                  onClick={() =>
                    setForm({
                      id: s.id,
                      name: s.name,
                      address_text: s.address_text,
                      city: s.city,
                      state: s.state,
                      pincode: s.pincode,
                      latitude: String(s.latitude),
                      longitude: String(s.longitude),
                      phone: s.phone ?? "",
                      opening_hours: s.opening_hours,
                      delivery_radius_km: String(s.delivery_radius_km),
                      is_active: s.is_active,
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit store" : "New store"}</DialogTitle>
          </DialogHeader>
          {form && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
