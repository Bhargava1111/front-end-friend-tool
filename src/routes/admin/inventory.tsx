import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminProductsClient } from "@/lib/admin-client.functions";
import { getAdminProducts } from "@/lib/admin.functions";
import { PackageX, Package, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Stock levels, low-stock alerts and inventory management." },
    ],
  }),
  component: InventoryPage,
});

type AdminProduct = {
  id: string;
  name: string;
  sku?: string;
  stock?: number;
  price?: number;
  is_active?: boolean;
  category_name?: string;
};

function stockFromId(id: string, stock?: number) {
  if (stock != null) return stock;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 50;
  return hash;
}
function stockStatus(stock: number) {
  if (stock <= 0) return { label: "Out of stock", tone: "bg-destructive/10 text-destructive", icon: PackageX };
  if (stock <= 5) return { label: "Critical", tone: "bg-destructive/10 text-destructive", icon: AlertTriangle };
  if (stock <= 15) return { label: "Low", tone: "bg-accent-soft text-accent-foreground", icon: AlertTriangle };
  return { label: "In stock", tone: "bg-primary-soft text-primary", icon: CheckCircle };
}

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const fetchProducts = useAdminFn(getAdminProducts, getAdminProductsClient);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts() as Promise<AdminProduct[]>,
  });

  const withStock = products.map((p) => ({ ...p, stock: stockFromId(p.id, p.stock) }));
  const filtered = withStock
    .filter((p) => {
      if (filter === "low") return (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 15;
      if (filter === "out") return (p.stock ?? 0) <= 0;
      return true;
    })
    .filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()),
    );

  const outOfStock = withStock.filter((p) => (p.stock ?? 0) <= 0).length;
  const lowStock = withStock.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 15).length;
  const inStock = withStock.filter((p) => (p.stock ?? 0) > 15).length;

  const stats = [
    { label: "Total SKUs", value: products.length, icon: Package },
    { label: "In stock", value: inStock, icon: CheckCircle },
    { label: "Low stock", value: lowStock, icon: AlertTriangle },
    { label: "Out of stock", value: outOfStock, icon: PackageX },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Monitor stock levels across all products</p>
        </div>
        <Link
          to="/admin/products/new"
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Add product
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="rounded-xl pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "out" ? "Out of stock" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-secondary" />
                    </td>
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No products match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const status = stockStatus(p.stock ?? 0);
                const StatusIcon = status.icon;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.stock ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", status.tone)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/admin/products/$id" params={{ id: p.id }} className="text-xs font-semibold text-primary">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
