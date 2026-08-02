import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminBanners,
  saveAdminBanner,
  deleteAdminBanner,
  toggleAdminBanner,
  getAdminCategories,
} from "@/lib/admin.functions";
import { adminListBrands, adminListCoupons } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/banners")({
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

const PLACEMENTS = [
  { value: "home", label: "Home" },
  { value: "offers", label: "Offers" },
  { value: "coupons", label: "Coupons" },
  { value: "brands", label: "Brands" },
  { value: "combos", label: "Combos" },
] as const;

type Placement = (typeof PLACEMENTS)[number]["value"];

type Form = {
  id?: string;
  placement: Placement;
  brand_id: string;
  coupon_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_slug: string;
  sort_order: string;
  is_active: boolean;
};

const empty: Form = {
  placement: "home",
  brand_id: "",
  coupon_id: "",
  title: "",
  subtitle: "",
  image_url: "",
  link_slug: "",
  sort_order: "0",
  is_active: true,
};

function AdminBanners() {
  const qc = useQueryClient();
  const fetchBanners = useServerFn(getAdminBanners);
  const fetchCategories = useServerFn(getAdminCategories);
  const save = useServerFn(saveAdminBanner);
  const remove = useServerFn(deleteAdminBanner);
  const toggle = useServerFn(toggleAdminBanner);
  const listBrands = useServerFn(adminListBrands);
  const listCoupons = useServerFn(adminListCoupons);
  const [tab, setTab] = useState<Placement>("home");
  const [form, setForm] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => fetchBanners(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => listBrands(),
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => listCoupons(),
  });

  const visible = data.filter((b) => (b.placement ?? "home") === tab);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["brand-directory"] });
    qc.invalidateQueries({ queryKey: ["placement-banners"] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: Form) =>
      save({
        data: {
          id: f.id,
          title: f.title,
          subtitle: f.subtitle || null,
          image_url: f.image_url,
          link_slug: f.link_slug || null,
          sort_order: Number(f.sort_order) || 0,
          is_active: f.is_active,
          placement: f.placement,
          brand_id: f.brand_id || null,
          coupon_id: f.coupon_id || null,
        },
      }),
    onSuccess: () => {
      toast.success("Banner saved");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <Button onClick={() => setForm({ ...empty, placement: tab })} className="gap-2">
          <Plus className="h-4 w-4" /> New banner
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
                    Order {b.sort_order} · {b.link_slug ? `→ /${b.link_slug}` : "No link"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: b.id, is_active: v })}
                    aria-label={`Toggle ${b.title}`}
                  />
                  <button
                    type="button"
                    aria-label={`Edit ${b.title}`}
                    onClick={() =>
                      setForm({
                        id: b.id,
                        title: b.title,
                        subtitle: b.subtitle ?? "",
                        image_url: b.image_url,
                        link_slug: b.link_slug ?? "",
                        sort_order: String(b.sort_order),
                        is_active: b.is_active,
                        placement: (b.placement ?? "home") as Placement,
                        brand_id: b.brand_id ?? "",
                        coupon_id: b.coupon_id ?? "",
                      })
                    }
                    className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
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

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit banner" : "New banner"}</DialogTitle>
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
                <Label htmlFor="b-title">Title</Label>
                <Input
                  id="b-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-sub">Subtitle</Label>
                <Input
                  id="b-sub"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
              <ImageUploadField
                label="Banner image"
                folder="banners"
                required
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                hint="Wide images work best (16:7). Upload as many banners as you like — the carousel paginates."
              />
              <div>
                <Label>Shown on</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) =>
                    setForm({ ...form, placement: v as Placement, brand_id: "", coupon_id: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} screen
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.placement === "brands" && (
                <div>
                  <Label>Attach to brand</Label>
                  <Select
                    value={form.brand_id || "none"}
                    onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Whole brands page</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.placement === "coupons" && (
                <div>
                  <Label>Attach to coupon</Label>
                  <Select
                    value={form.coupon_id || "none"}
                    onValueChange={(v) => setForm({ ...form, coupon_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All coupons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Whole coupons page</SelectItem>
                      {coupons.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Links to category</Label>
                  <Select
                    value={form.link_slug || "none"}
                    onValueChange={(v) => setForm({ ...form, link_slug: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No link</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="b-order">Sort order</Label>
                  <Input
                    id="b-order"
                    inputMode="numeric"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save banner"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
