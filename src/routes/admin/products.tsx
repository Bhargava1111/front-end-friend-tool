import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminProducts,
  saveAdminProduct,
  deleteAdminProduct,
} from "@/lib/admin.functions";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Product Management — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Create, edit, price and stock-manage catalogue products." },
      { property: "og:title", content: "Product Management — Admin" },
      { property: "og:description", content: "Manage the grocery and pooja catalogue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProducts,
});

type Form = {
  id?: string;
  name: string;
  slug: string;
  price: string;
  mrp: string;
  stock: string;
  weight: string;
  category_id: string;
  image_url: string;
  video_url: string;
  gallery: string;
  description: string;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
};

const empty: Form = {
  name: "",
  slug: "",
  price: "",
  mrp: "",
  stock: "0",
  weight: "",
  category_id: "",
  image_url: "",
  video_url: "",
  gallery: "",
  description: "",
  is_active: true,
  is_featured: false,
  is_best_seller: false,
};

function AdminProducts() {
  const qc = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const save = useServerFn(saveAdminProduct);
  const remove = useServerFn(deleteAdminProduct);

  const [form, setForm] = useState<Form | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: Form) =>
      save({
        data: {
          id: f.id,
          name: f.name,
          slug: f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          price: Number(f.price),
          mrp: f.mrp ? Number(f.mrp) : null,
          stock: Number(f.stock),
          weight: f.weight || null,
          category_id: f.category_id || null,
          image_url: f.image_url || null,
          video_url: f.video_url || null,
          gallery: f.gallery
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
          description: f.description || null,
          is_active: f.is_active,
          is_featured: f.is_featured,
          is_best_seller: f.is_best_seller,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const products = (data?.products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const categories = data?.categories ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setForm(empty)} className="gap-2">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.weight ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatINR(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? "font-semibold text-destructive" : ""}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.is_active ? "Active" : "Hidden"}
                    {p.is_featured ? " · Featured" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${p.name}`}
                        onClick={() =>
                          setForm({
                            id: p.id,
                            name: p.name,
                            slug: p.slug,
                            price: String(p.price),
                            mrp: p.mrp ? String(p.mrp) : "",
                            stock: String(p.stock),
                            weight: p.weight ?? "",
                            category_id: p.category_id ?? "",
                            image_url: p.image_url ?? "",
                            video_url: p.video_url ?? "",
                            gallery: (p.gallery ?? []).join("\n"),
                            description: p.description ?? "",
                            is_active: p.is_active,
                            is_featured: p.is_featured,
                            is_best_seller: p.is_best_seller,
                          })
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit product" : "New product"}</DialogTitle>
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
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-price">Price (₹)</Label>
                  <Input
                    id="p-price"
                    required
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="p-mrp">MRP (₹)</Label>
                  <Input
                    id="p-mrp"
                    inputMode="decimal"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="p-stock">Stock</Label>
                  <Input
                    id="p-stock"
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="p-weight">Weight / pack</Label>
                  <Input
                    id="p-weight"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p-image">Image URL</Label>
                <Input
                  id="p-image"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-video">Video URL (MP4 or YouTube embed)</Label>
                <Input
                  id="p-video"
                  placeholder="https://…"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-gallery">Extra image URLs (one per line)</Label>
                <Textarea
                  id="p-gallery"
                  rows={3}
                  placeholder={"https://…/img-2.jpg\nhttps://…/img-3.jpg"}
                  value={form.gallery}
                  onChange={(e) => setForm({ ...form, gallery: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-5 pt-1">
                {(
                  [
                    ["is_active", "Active"],
                    ["is_featured", "Featured"],
                    ["is_best_seller", "Best seller"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form[key]}
                      onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save product"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
