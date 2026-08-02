import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCategories,
  saveAdminCategory,
  deleteAdminCategory,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/image-upload";

export const Route = createFileRoute("/admin/categories")({
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

type Form = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const empty: Form = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
};

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function AdminCategories() {
  const qc = useQueryClient();
  const fetchCategories = useServerFn(getAdminCategories);
  const save = useServerFn(saveAdminCategory);
  const remove = useServerFn(deleteAdminCategory);
  const [form, setForm] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: Form) =>
      save({
        data: {
          id: f.id,
          name: f.name,
          slug: f.slug || slugify(f.name),
          description: f.description || null,
          image_url: f.image_url || null,
          sort_order: Number(f.sort_order) || 0,
          is_active: f.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Category saved");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <Button onClick={() => setForm(empty)} className="gap-2">
          <Plus className="h-4 w-4" /> New category
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
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${c.name}`}
                  onClick={() =>
                    setForm({
                      id: c.id,
                      name: c.name,
                      slug: c.slug,
                      description: c.description ?? "",
                      image_url: c.image_url ?? "",
                      sort_order: String(c.sort_order),
                      is_active: c.is_active,
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: form.id ? form.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="c-slug">Slug</Label>
                  <Input
                    id="c-slug"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="c-order">Sort order</Label>
                  <Input
                    id="c-order"
                    inputMode="numeric"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </div>
              </div>
              <ImageUploadField
                label="Category image"
                folder="categories"
                aspect="aspect-square max-w-[200px]"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
              <div>
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 pt-1 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save category"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
