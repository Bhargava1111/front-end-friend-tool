import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminCategoriesClient, getAdminBannersClient, deleteAdminBannerClient, toggleAdminBannerClient } from "@/lib/admin-client.functions";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminBanners, deleteAdminBanner, toggleAdminBanner, getAdminCategories } from "@/lib/admin.functions";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PLACEMENTS, type Placement } from "@/components/admin-banner-form";

export const Route = createFileRoute("/admin/banners/")({
  head: () => ({
    meta: [
      { title: "Banner Management — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Create and schedule homepage promotional banners." },
      { property: "og:title", content: "Banner Management — Admin" },
      { property: "og:description", content: "Manage homepage banner slides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBanners,
});

function AdminBanners() {
  const qc = useQueryClient();
  const fetchBanners = useAdminFn(getAdminBanners, getAdminBannersClient);
  const fetchCategories = useAdminFn(getAdminCategories, getAdminCategoriesClient);
  const remove = useAdminFn(deleteAdminBanner, deleteAdminBannerClient);
  const toggle = useAdminFn(toggleAdminBanner, toggleAdminBannerClient);
  const [tab, setTab] = useState<Placement>("home");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => fetchBanners(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const visible = data.filter((b) => (b.placement ?? "home") === tab);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["brand-directory"] });
    qc.invalidateQueries({ queryKey: ["placement-banners"] });
    qc.invalidateQueries({ queryKey: ["combo-packs"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Banner deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => toggle({ data: vars }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-foreground">Banners</h1>
          <p className="text-xs text-muted-foreground">
            Manage banners separately for each screen
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/admin/banners/new" search={{ placement: tab }}>
            <Plus className="h-4 w-4" /> {tab === "combos" ? "New combo pack" : "New banner"}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLACEMENTS.map((p) => {
          const count = data.filter((b) => (b.placement ?? "home") === p.value).length;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setTab(p.value)}
              className={
                tab === p.value
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-foreground"
              }
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading && <div className="h-56 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No banners for this screen yet.
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-[16/7] bg-secondary">
                <img
                  src={b.image_url}
                  alt={b.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.subtitle ?? "—"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Order {b.sort_order}
                    {b.product
                      ? ` · ${formatINR(b.product.price)}`
                      : b.link_slug
                        ? ` · → /${b.link_slug}`
                        : " · No link"}
                    {tab === "combos" && b.link_slug
                      ? ` · ${categories.find((c) => c.slug === b.link_slug)?.name ?? b.link_slug}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: b.id, is_active: v })}
                    aria-label={`Toggle ${b.title}`}
                  />
                  <Link
                    to="/admin/banners/$id"
                    params={{ id: b.id }}
                    aria-label={`Edit ${b.title}`}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${b.title}`}
                    onClick={() => deleteMutation.mutate(b.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
