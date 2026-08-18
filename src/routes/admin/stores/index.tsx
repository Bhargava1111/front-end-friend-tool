import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminStores, deleteAdminStore } from "@/lib/admin.functions";
import { StoreMap } from "@/components/store-map";
import { Button } from "@/components/ui/button";
import type { StoreLocation } from "@/lib/geo";

export const Route = createFileRoute("/admin/stores/")({
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

function AdminStores() {
  const qc = useQueryClient();
  const fetchStores = useServerFn(getAdminStores);
  const remove = useServerFn(deleteAdminStore);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fetchStores() as Promise<StoreLocation[]>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
    qc.invalidateQueries({ queryKey: ["stores"] });
  };

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
        <Button asChild className="gap-2">
          <Link to="/admin/stores/new">
            <Plus className="h-4 w-4" /> New store
          </Link>
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
                <Link
                  to="/admin/stores/$id"
                  params={{ id: s.id }}
                  aria-label={`Edit ${s.name}`}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
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
    </div>
  );
}
