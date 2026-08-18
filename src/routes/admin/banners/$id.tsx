import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminBanners, getAdminCategories, saveAdminBanner } from "@/lib/admin.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import {
  AdminBannerForm,
  buildSavePayload,
  type BannerFormState,
  type Placement,
} from "@/components/admin-banner-form";

export const Route = createFileRoute("/admin/banners/$id")({
  component: EditBanner,
});

function EditBanner() {
  const { id } = useParams({ from: "/admin/banners/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchBanners = useServerFn(getAdminBanners);
  const fetchCategories = useServerFn(getAdminCategories);
  const save = useServerFn(saveAdminBanner);
  const [form, setForm] = useState<BannerFormState | null>(null);

  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => fetchBanners(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const banner = banners.find((b) => b.id === id);

  const comboCategoryFields = (b: (typeof banners)[number]) => {
    const productCategoryId = b.product?.category_id ?? null;
    const linked = productCategoryId
      ? categories.find((c) => c.id === productCategoryId)
      : categories.find((c) => c.slug === b.link_slug);
    if (!linked) return { category_id: "", subcategory_id: "" };
    if (linked.parent_id) {
      return { category_id: linked.parent_id, subcategory_id: linked.id };
    }
    return { category_id: linked.id, subcategory_id: "" };
  };

  useEffect(() => {
    if (banner) {
      setForm({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle ?? "",
        image_url: banner.image_url,
        link_slug: banner.link_slug ?? "",
        sort_order: String(banner.sort_order),
        is_active: banner.is_active ?? true,
        placement: (banner.placement ?? "home") as Placement,
        brand_id: banner.brand_id ?? "",
        coupon_id: banner.coupon_id ?? "",
        product_id: banner.product_id ?? banner.product?.id ?? "",
        combo_price: banner.product ? String(banner.product.price) : "",
        combo_mrp: banner.product?.mrp ? String(banner.product.mrp) : "",
        combo_stock: banner.product ? String(banner.product.stock) : "50",
        combo_items: (banner.product?.combo_items ?? []).map((item) => ({
          product_id: item.product_id,
          quantity: String(item.quantity ?? 1),
        })),
        ...comboCategoryFields(banner),
      });
    }
  }, [banner, categories]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["brand-directory"] });
    qc.invalidateQueries({ queryKey: ["placement-banners"] });
    qc.invalidateQueries({ queryKey: ["combo-packs"] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: BannerFormState) => save({ data: buildSavePayload(f) }),
    onSuccess: () => {
      toast.success("Banner saved");
      invalidate();
      navigate({ to: "/admin/banners" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bannersLoading || !form) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!banner) {
    return (
      <AdminFormShell backTo="/admin/banners" backLabel="Back to banners" title="Banner not found">
        <p className="text-sm text-muted-foreground">This banner does not exist.</p>
      </AdminFormShell>
    );
  }

  const title = form.placement === "combos" ? "Edit combo pack" : "Edit banner";

  return (
    <AdminFormShell backTo="/admin/banners" backLabel="Back to banners" title={title}>
      <AdminBannerForm
        form={form}
        setForm={setForm}
        onSubmit={() => saveMutation.mutate(form)}
        isPending={saveMutation.isPending}
      />
    </AdminFormShell>
  );
}
