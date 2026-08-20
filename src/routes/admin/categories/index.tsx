import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminCategoriesClient, deleteAdminCategoryClient } from "@/lib/admin-client.functions";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminCategories, deleteAdminCategory } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/categories/")({
  head: () => ({
    meta: [
      { title: "Category Management — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Create and organise storefront product categories." },
      { property: "og:title", content: "Category Management — Admin" },
      { property: "og:description", content: "Add, edit and reorder categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const fetchCategories = useAdminFn(getAdminCategories, getAdminCategoriesClient);
  const remove = useAdminFn(deleteAdminCategory, deleteAdminCategoryClient);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-foreground">Categories</h1>
        <Button asChild className="gap-2">
          <Link to="/admin/categories/new">
            <Plus className="h-4 w-4" /> New category
          </Link>
        </Button>
      </div>

      {isLoading && <div className="h-56 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">/{c.slug}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Order {c.sort_order} · {c.is_active ? "Active" : "Hidden"}
                  {c.parent_id
                    ? ` · Under ${data.find((p) => p.id === c.parent_id)?.name ?? "parent"}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to="/admin/categories/$id"
                  params={{ id: c.id }}
                  aria-label={`Edit ${c.name}`}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
