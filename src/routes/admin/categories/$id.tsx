import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminCategories, saveAdminCategory } from "@/lib/admin.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/categories/$id")({
  component: EditCategory,
});

type Form = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
  parent_id: string;
};

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function EditCategory() {
  const { id } = useParams({ from: "/admin/categories/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCategories = useServerFn(getAdminCategories);
  const save = useServerFn(saveAdminCategory);
  const [form, setForm] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const category = data.find((c) => c.id === id);
  const topCategories = data.filter((c) => !c.parent_id);

  useEffect(() => {
    if (category) {
      setForm({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        image_url: category.image_url ?? "",
        sort_order: String(category.sort_order),
        is_active: category.is_active,
        parent_id: category.parent_id ?? "",
      });
    }
  }, [category]);

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
          parent_id: f.parent_id || null,
        },
      }),
    onSuccess: () => {
      toast.success("Category saved");
      invalidate();
      navigate({ to: "/admin/categories" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!category) {
    return (
      <AdminFormShell backTo="/admin/categories" backLabel="Back to categories" title="Category not found">
        <p className="text-sm text-muted-foreground">This category does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell backTo="/admin/categories" backLabel="Back to categories" title="Edit category">
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
        <div>
          <Label>Parent category (subcategory of)</Label>
          <Select
            value={form.parent_id || "none"}
            onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Top-level category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Top-level category</SelectItem>
              {topCategories
                .filter((c) => c.id !== form.id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
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
    </AdminFormShell>
  );
}
