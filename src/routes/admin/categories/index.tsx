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
        <div className="space-y-4">
          {data
            .filter((c) => !c.parent_id)
            .map((parent) => {
              const children = data.filter((c) => c.parent_id === parent.id);
              return (
                <div key={parent.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex gap-3 p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {parent.image_url && (
                        <img
                          src={parent.image_url}
                          alt={parent.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{parent.name}</p>
                      <p className="truncate text-xs text-muted-foreground">/{parent.slug}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Order {parent.sort_order} · {parent.is_active ? "Active" : "Hidden"}
                        {children.length > 0 ? ` · ${children.length} subcategories` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        to="/admin/categories/$id"
                        params={{ id: parent.id }}
                        aria-label={`Edit ${parent.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Delete ${parent.name}`}
                        onClick={() => deleteMutation.mutate(parent.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {children.length > 0 && (
                    <div className="grid gap-2 border-t border-border bg-secondary/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {children.map((child) => (
                        <div key={child.id} className="flex gap-2 rounded-xl border border-border bg-card p-2">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            {child.image_url && (
                              <img
                                src={child.image_url}
                                alt={child.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">{child.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">/{child.slug}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Link
                              to="/admin/categories/$id"
                              params={{ id: child.id }}
                              aria-label={`Edit ${child.name}`}
                              className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </Link>
                            <button
                              type="button"
                              aria-label={`Delete ${child.name}`}
                              onClick={() => deleteMutation.mutate(child.id)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          {data
            .filter((c) => c.parent_id && !data.some((p) => p.id === c.parent_id))
            .map((orphan) => (
              <div key={orphan.id} className="flex gap-3 rounded-2xl border border-dashed border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{orphan.name}</p>
                  <p className="text-[11px] text-muted-foreground">Orphan subcategory — parent missing</p>
                </div>
                <Link
                  to="/admin/categories/$id"
                  params={{ id: orphan.id }}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
