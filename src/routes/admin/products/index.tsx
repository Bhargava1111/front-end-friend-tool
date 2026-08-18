import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminProducts,
  deleteAdminProduct,
  setProductPlacements,
} from "@/lib/admin.functions";
import { OFFER_SECTIONS, offerSectionLabel } from "@/lib/offer-sections";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/products/")({
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

function AdminProducts() {
  const qc = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const remove = useServerFn(deleteAdminProduct);
  const setPlacements = useServerFn(setProductPlacements);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetSection, setTargetSection] = useState(OFFER_SECTIONS[0].key);
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const placementMutation = useMutation({
    mutationFn: (action: "add" | "remove") =>
      setPlacements({
        data: {
          product_ids: [...selected],
          section: targetSection,
          action,
        },
      }),
    onSuccess: (res, action) => {
      const count = action === "add" ? res.added ?? selected.size : res.removed ?? selected.size;
      toast.success(
        action === "add"
          ? `Added ${count} product(s) to ${offerSectionLabel(targetSection)}`
          : `Removed ${count} product(s) from ${offerSectionLabel(targetSection)}`,
      );
      setSelected(new Set());
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allProducts = data?.products ?? [];
  const products = allProducts.filter((p) => {
    const row = p as { offer_sections?: string[] };
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesSection =
      sectionFilter === "all" || (row.offer_sections ?? []).includes(sectionFilter);
    return matchesSearch && matchesSection;
  });
  const categories = data?.categories ?? [];
  const categoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All offers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {OFFER_SECTIONS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild className="gap-2">
          <Link to="/admin/products/new">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft/40 p-3">
          <span className="text-xs font-semibold text-foreground">{selected.size} selected</span>
          <Select value={targetSection} onValueChange={setTargetSection}>
            <SelectTrigger className="h-9 w-[180px] bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFER_SECTIONS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={placementMutation.isPending}
            onClick={() => placementMutation.mutate("add")}
          >
            <Tag className="h-3.5 w-3.5" /> Add to offer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={placementMutation.isPending}
            onClick={() => placementMutation.mutate("remove")}
          >
            Remove from offer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={products.length > 0 && products.every((p) => selected.has(p.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(products.map((p) => p.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? "bg-primary-soft/30" : undefined}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        });
                      }}
                    />
                  </td>
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
                        <p className="font-medium text-foreground">
                          {p.name}
                          {p.is_combo && (
                            <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Combo
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.weight ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {categoryName(p.category_id)}
                  </td>
                  <td className="px-4 py-3">
                    {p.variants.length > 0
                      ? `${formatINR(Math.min(...p.variants.map((v) => Number(v.price))))} – ${formatINR(
                          Math.max(...p.variants.map((v) => Number(v.price))),
                        )}`
                      : formatINR(p.price)}
                    {p.variants.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {p.variants.length} pack sizes
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? "font-semibold text-destructive" : ""}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>
                      {p.is_active ? "Active" : "Hidden"}
                      {p.is_featured ? " · Featured" : ""}
                    </p>
                    {((p as { offer_sections?: string[] }).offer_sections ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {((p as { offer_sections?: string[] }).offer_sections ?? []).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground"
                          >
                            {offerSectionLabel(s)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to="/admin/products/$id"
                        params={{ id: p.id }}
                        aria-label={`Edit ${p.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
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
    </div>
  );
}
