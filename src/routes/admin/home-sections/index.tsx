import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import {
  adminListHomeSectionsClient,
  adminDeleteHomeSectionClient,
  adminReorderHomeSectionClient,
} from "@/lib/admin-client.functions";
import { Pencil, Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  adminListHomeSections,
  adminDeleteHomeSection,
  adminReorderHomeSection,
} from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import type { HomeOfferSectionDef } from "@/lib/offer-sections";
import { FALLBACK_RULES, SECTION_LAYOUTS } from "@/lib/offer-sections";

export const Route = createFileRoute("/admin/home-sections/")({
  component: AdminHomeSectionsPage,
});

function AdminHomeSectionsPage() {
  const list = useAdminFn(adminListHomeSections, adminListHomeSectionsClient);
  const remove = useAdminFn(adminDeleteHomeSection, adminDeleteHomeSectionClient);
  const reorder = useAdminFn(adminReorderHomeSection, adminReorderHomeSectionClient);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: () => list() as Promise<HomeOfferSectionDef[]>,
  });

  const sections = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      toast.success("Section deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMutation = useMutation({
    mutationFn: (vars: { id: string; direction: "up" | "down" }) => reorder({ data: vars }),
    onSuccess: (res) => {
      if (res.moved) {
        queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
        queryClient.invalidateQueries({ queryKey: ["home"] });
        toast.success("Section moved");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const layoutLabel = (v: string) => SECTION_LAYOUTS.find((l) => l.value === v)?.label ?? v;
  const fallbackLabel = (v: string) => FALLBACK_RULES.find((r) => r.value === v)?.label ?? v;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Home sections</h1>
          <p className="text-xs text-muted-foreground">
            Drag order with ↑ ↓ — sections appear on the home page top to bottom
          </p>
        </div>
        <Button size="sm" className="rounded-xl" asChild>
          <Link to="/admin/home-sections/new">
            <Plus className="mr-1.5 h-4 w-4" /> New section
          </Link>
        </Button>
      </div>

      {isError ? (
        <ErrorState description="Could not load home sections." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s, index) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0 || moveMutation.isPending}
                  aria-label="Move up"
                  onClick={() => moveMutation.mutate({ id: s.id, direction: "up" })}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === sections.length - 1 || moveMutation.isPending}
                  aria-label="Move down"
                  onClick={() => moveMutation.mutate({ id: s.id, direction: "down" })}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {layoutLabel(s.layout)} · {fallbackLabel(s.fallback_rule)} · key: {s.key}
                  {s.max_price ? ` · max ₹${s.max_price}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.placed_count ?? 0} manually placed · {s.display_count ?? 0} shown on store
                  {" · sort "}
                  {s.sort_order ?? index}
                </p>
                {s.subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{s.subtitle}</p> : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!s.is_active && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">Hidden</span>
                )}
                {s.show_on_home ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    On home
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">Products only</span>
                )}
              </div>
              <Button size="icon" variant="ghost" aria-label={`Edit ${s.title}`} asChild>
                <Link to="/admin/home-sections/$id" params={{ id: s.id }}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${s.title}`}
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${s.title}"? Products will be unassigned from this section.`)) {
                    deleteMutation.mutate(s.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {sections.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No sections yet. Create one to show product rails on the home page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
