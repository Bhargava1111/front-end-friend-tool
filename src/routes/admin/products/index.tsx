import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminProductsClient, deleteAdminProductClient, setProductPlacementsClient } from "@/lib/admin-client.functions";

import { Plus, Pencil, Trash2, Tag, TagIcon } from "lucide-react";
import { toast } from "sonner";
import { getAdminProducts, deleteAdminProduct, setProductPlacements } from "@/lib/admin.functions";
import { OFFER_SECTIONS, offerSectionLabel } from "@/lib/offer-sections";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

type ProductRow = {
  id: string;
  name: string;
  weight?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  price: number;
  stock: number;
  is_active?: boolean;
  is_featured?: boolean;
  is_combo?: boolean;
  variants: Array<{ price: number }>;
  offer_sections?: string[];
};

function AdminProducts() {
  const qc = useQueryClient();
  const fetchProducts = useAdminFn(getAdminProducts, getAdminProductsClient);
  const remove = useAdminFn(deleteAdminProduct, deleteAdminProductClient);
  const setPlacements = useAdminFn(setProductPlacements, setProductPlacementsClient);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetSection, setTargetSection] = useState(OFFER_SECTIONS[0].key);
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
    staleTime: 60_000,
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
    mutationFn: (vars: { productIds: string[]; section: string; action: "add" | "remove" }) =>
      setPlacements({
        data: {
          product_ids: vars.productIds,
          section: vars.section,
          action: vars.action,
        },
      }),
    onSuccess: (res, vars) => {
      const count =
        vars.action === "add"
          ? res.added ?? vars.productIds.length
          : res.removed ?? vars.productIds.length;
      toast.success(
        vars.action === "add"
          ? `Added ${count} product(s) to ${offerSectionLabel(vars.section)}`
          : `Removed ${count} product(s) from ${offerSectionLabel(vars.section)}`,
      );
      if (vars.productIds.length > 1) setSelected(new Set());
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allProducts = (data?.products ?? []) as ProductRow[];
  const sectionCounts = Object.fromEntries(
    OFFER_SECTIONS.map((s) => [
      s.key,
      allProducts.filter((p) => (p.offer_sections ?? []).includes(s.key)).length,
    ]),
  ) as Record<string, number>;

  const products = allProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesSection =
      sectionFilter === "all" || (p.offer_sections ?? []).includes(sectionFilter);
    return matchesSearch && matchesSection;
  });
  const categories = data?.categories ?? [];
  const categoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const togglePlacement = (productId: string, section: string, inSection: boolean) => {
    placementMutation.mutate({
      productIds: [productId],
      section,
      action: inSection ? "remove" : "add",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Products</h1>
          <p className="text-xs text-muted-foreground">
            Manage catalogue and assign products to home-page offer sections
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/admin/products/new">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </Button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSectionFilter("all")}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
            sectionFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          All ({allProducts.length})
        </button>
        {OFFER_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setSectionFilter(s.key);
              setTargetSection(s.key);
            }}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium",
              sectionFilter === s.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {s.label} ({sectionCounts[s.key] ?? 0})
          </button>
        ))}
      </div>

      {sectionFilter !== "all" && (
        <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Products listed here appear in the <strong className="text-foreground">{offerSectionLabel(sectionFilter)}</strong> block on the home page. Use the tag buttons to add or remove individual products.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
            onClick={() =>
              placementMutation.mutate({
                productIds: [...selected],
                section: targetSection,
                action: "add",
              })
            }
          >
            <Tag className="h-3.5 w-3.5" /> Add to offer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={placementMutation.isPending}
            onClick={() =>
              placementMutation.mutate({
                productIds: [...selected],
                section: targetSection,
                action: "remove",
              })
            }
          >
            Remove from offer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && products.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {sectionFilter === "all"
            ? "No products match your search."
            : `No products in ${offerSectionLabel(sectionFilter)} yet. Select products and add them to this section.`}
        </p>
      )}

      {!isLoading && products.length > 0 && (
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
              {products.map((p) => {
                const sections = p.offer_sections ?? [];
                const inActiveSection =
                  sectionFilter !== "all" && sections.includes(sectionFilter);
                return (
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
                      {sections.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sections.map((s) => (
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
                        {sectionFilter !== "all" && (
                          <button
                            type="button"
                            title={inActiveSection ? "Remove from section" : "Add to section"}
                            disabled={placementMutation.isPending}
                            onClick={() => togglePlacement(p.id, sectionFilter, inActiveSection)}
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-lg",
                              inActiveSection
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary-soft text-primary",
                            )}
                          >
                            {inActiveSection ? (
                              <TagIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Tag className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
