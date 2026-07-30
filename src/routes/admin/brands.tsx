import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminListBrands, adminSaveBrand, adminDeleteBrand } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrandsPage,
});

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const blank = { name: "", slug: "", tagline: "", logo_url: "", sort_order: 0, is_active: true };

function AdminBrandsPage() {
  const list = useServerFn(adminListBrands);
  const save = useServerFn(adminSaveBrand);
  const remove = useServerFn(adminDeleteBrand);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => list() as Promise<BrandRow[]>,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: editing ?? undefined,
          name: form.name.trim(),
          slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          tagline: form.tagline,
          logo_url: form.logo_url,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-meta"] });
      toast.success(editing ? "Brand updated" : "Brand added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Brand deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm({ ...blank });
    setOpen(true);
  }

  function openEdit(b: BrandRow) {
    setEditing(b.id);
    setForm({
      name: b.name,
      slug: b.slug,
      tagline: b.tagline ?? "",
      logo_url: b.logo_url ?? "",
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Brands</h1>
          <p className="text-xs text-muted-foreground">Featured brands shown on the home screen</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" /> New brand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit brand" : "New brand"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-name">Name</Label>
                <Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-slug">Slug</Label>
                <Input
                  id="b-slug"
                  value={form.slug}
                  placeholder="auto from name"
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-tag">Tagline</Label>
                <Input id="b-tag" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-logo">Logo URL</Label>
                <Input id="b-logo" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-sort">Sort order</Label>
                  <Input
                    id="b-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    id="b-active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label htmlFor="b-active">Active</Label>
                </div>
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={!form.name.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save brand
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <Button size="icon" variant="ghost" aria-label={`Edit ${b.name}`} onClick={() => openEdit(b)}>
                <Pencil className="h-4 w-4" />
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
