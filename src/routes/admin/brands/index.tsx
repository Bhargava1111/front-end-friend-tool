import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminListBrands, adminDeleteBrand } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";

export const Route = createFileRoute("/admin/brands/")({
  component: AdminBrandsPage,
});

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function AdminBrandsPage() {
  const list = useServerFn(adminListBrands);
  const remove = useServerFn(adminDeleteBrand);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => list() as Promise<BrandRow[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Brand deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Brands</h1>
          <p className="text-xs text-muted-foreground">Featured brands shown on the home screen</p>
        </div>
        <Button size="sm" className="rounded-xl" asChild>
          <Link to="/admin/brands/new">
            <Plus className="mr-1.5 h-4 w-4" /> New brand
          </Link>
        </Button>
      </div>

      {isError ? (
        <ErrorState description="Could not load brands." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-xs font-bold text-primary">
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  b.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.name}</p>
                <p className="truncate text-xs text-muted-foreground">{b.tagline ?? b.slug}</p>
              </div>
              {!b.is_active && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">Hidden</span>
              )}
              <Button size="icon" variant="ghost" aria-label={`Edit ${b.name}`} asChild>
                <Link to="/admin/brands/$id" params={{ id: b.id }}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${b.name}`}
                className="text-destructive"
                onClick={() => deleteMutation.mutate(b.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
