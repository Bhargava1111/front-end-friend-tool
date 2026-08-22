import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import {
  adminListHomeSectionsClient,
  adminDeleteHomeSectionClient,
  adminBulkReorderHomeSectionsClient,
  adminSyncHomeSectionsClient,
} from "@/lib/admin-client.functions";
import { Pencil, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  adminListHomeSections,
  adminDeleteHomeSection,
  adminBulkReorderHomeSections,
  adminSyncHomeSections,
} from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import type { HomeOfferSectionDef } from "@/lib/offer-sections";
import { FALLBACK_RULES, SECTION_LAYOUTS } from "@/lib/offer-sections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/home-sections/")({
  component: AdminHomeSectionsPage,
});

function invalidateHomeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
  queryClient.invalidateQueries({ queryKey: ["home"] });
  queryClient.invalidateQueries({ queryKey: ["admin-products"] });
}

function sortSections(list: HomeOfferSectionDef[]) {
  return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function reorderIds(ids: string[], fromId: string, toId: string) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function AdminHomeSectionsPage() {
  const list = useAdminFn(adminListHomeSections, adminListHomeSectionsClient);
  const remove = useAdminFn(adminDeleteHomeSection, adminDeleteHomeSectionClient);
  const bulkReorder = useAdminFn(adminBulkReorderHomeSections, adminBulkReorderHomeSectionsClient);
  const syncDefaults = useAdminFn(adminSyncHomeSections, adminSyncHomeSectionsClient);
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localIds, setLocalIds] = useState<string[] | null>(null);
  const reorderLockRef = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: () => list() as Promise<HomeOfferSectionDef[]>,
  });

  const serverSections = useMemo(() => sortSections(data ?? []), [data]);

  const sections = useMemo(() => {
    const byId = new Map(serverSections.map((s) => [s.id, s]));
    const order = localIds ?? serverSections.map((s) => s.id);
    return order.map((id) => byId.get(id)).filter((s): s is HomeOfferSectionDef => Boolean(s));
  }, [serverSections, localIds]);

  useEffect(() => {
    if (reorderLockRef.current) return;
    const serverIds = serverSections.map((s) => s.id);
    if (!serverIds.length) {
      setLocalIds(null);
      return;
    }
    if (!localIds) {
      setLocalIds(serverIds);
      return;
    }

    const localSet = new Set(localIds);
    const idsChanged =
      serverIds.length !== localIds.length ||
      serverIds.some((id) => !localSet.has(id)) ||
      localIds.some((id) => !serverIds.includes(id));

    if (idsChanged) {
      setLocalIds(serverIds);
    }
  }, [serverSections, localIds]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      reorderLockRef.current = false;
      setLocalIds(null);
      invalidateHomeQueries(queryClient);
      toast.success("Section deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkReorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      bulkReorder({ data: { ordered_ids: orderedIds } }) as Promise<{ ok: boolean; reordered: number }>,
    onSuccess: async (_res, orderedIds) => {
      setLocalIds(orderedIds);
      invalidateHomeQueries(queryClient);
      await queryClient.refetchQueries({ queryKey: ["admin-home-sections"] });
      toast.success("Section order saved");
      reorderLockRef.current = false;
    },
    onError: (e: Error) => {
      reorderLockRef.current = false;
      setLocalIds(null);
      toast.error(e.message || "Could not save section order");
    },
  });

  const applyOrder = (nextIds: string[]) => {
    if (bulkReorderMutation.isPending) return;
    reorderLockRef.current = true;
    setLocalIds(nextIds);
    bulkReorderMutation.mutate(nextIds);
  };

  const syncMutation = useMutation({
    mutationFn: () => syncDefaults(),
    onSuccess: async (res) => {
      reorderLockRef.current = false;
      setLocalIds(null);
      invalidateHomeQueries(queryClient);
      await queryClient.refetchQueries({ queryKey: ["admin-home-sections"] });
      toast.success(
        res.created > 0
          ? `Added ${res.created} missing section${res.created !== 1 ? "s" : ""} (${res.total} total)`
          : `All ${res.total} default sections present`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDrop = (targetId: string, sourceId?: string) => {
    const fromId = sourceId ?? draggingId;
    if (!fromId || fromId === targetId) return;
    const ids = sections.map((s) => s.id);
    applyOrder(reorderIds(ids, fromId, targetId));
    setDraggingId(null);
    setDragOverId(null);
  };

  const moveByIndex = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const ids = sections.map((s) => s.id);
    applyOrder(reorderIds(ids, ids[index], ids[targetIndex]));
  };

  const layoutLabel = (v: string) => SECTION_LAYOUTS.find((l) => l.value === v)?.label ?? v;
  const fallbackLabel = (v: string) => FALLBACK_RULES.find((r) => r.value === v)?.label ?? v;
  const reordering = bulkReorderMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Home sections</h1>
          <p className="text-xs text-muted-foreground">
            Drag a row or use ↑ ↓ — order updates the live home page
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl"
            disabled={syncMutation.isPending || reordering}
            onClick={() => syncMutation.mutate()}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", syncMutation.isPending && "animate-spin")} />
            Add missing sections
          </Button>
          <Button size="sm" className="rounded-xl" asChild>
            <Link to="/admin/home-sections/new">
              <Plus className="mr-1.5 h-4 w-4" /> New section
            </Link>
          </Button>
        </div>
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
              draggable={!reordering}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", s.id);
                e.dataTransfer.effectAllowed = "move";
                setDraggingId(s.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverId !== s.id) setDragOverId(s.id);
              }}
              onDragLeave={() => setDragOverId((id) => (id === s.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const sourceId = e.dataTransfer.getData("text/plain") || draggingId || "";
                handleDrop(s.id, sourceId || undefined);
              }}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated transition-shadow",
                !reordering && "cursor-grab active:cursor-grabbing",
                draggingId === s.id && "opacity-50",
                dragOverId === s.id && "ring-2 ring-primary",
              )}
            >
              <div
                className="flex shrink-0 touch-none flex-col items-center gap-0.5"
                title="Drag to reorder"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0 || reordering}
                  aria-label="Move up"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveByIndex(index, "up");
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === sections.length - 1 || reordering}
                  aria-label="Move down"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveByIndex(index, "down");
                  }}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {layoutLabel(s.layout)} · {fallbackLabel(s.fallback_rule)} · key: {s.key}
                  {(s.layout === "budget_rail" || s.fallback_rule === "under_99") && s.max_price
                    ? ` · max ₹${s.max_price}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.placed_count ?? 0} manually placed · {s.display_count ?? 0} shown on store
                  {" · sort "}
                  {index + 1}
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
                onMouseDown={(e) => e.stopPropagation()}
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
              No sections yet. Click &quot;Add missing sections&quot; or create one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
