import { Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminProductsClient, getAdminCategoriesClient, adminListCouponsClient, adminListBrandsClient } from "@/lib/admin-client.functions";
import { getAdminCategories, getAdminProducts } from "@/lib/admin.functions";
import { adminListBrands, adminListCoupons } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PLACEMENTS = [
  { value: "home", label: "Home" },
  { value: "offers", label: "Offers" },
  { value: "coupons", label: "Coupons" },
  { value: "brands", label: "Brands" },
  { value: "combos", label: "Combos" },
] as const;

export type Placement = (typeof PLACEMENTS)[number]["value"];

export type ComboItemRow = { product_id: string; quantity: string };

export type BannerFormState = {
  id?: string;
  placement: Placement;
  brand_id: string;
  coupon_id: string;
  product_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_slug: string;
  sort_order: string;
  is_active: boolean;
  combo_price: string;
  combo_mrp: string;
  combo_stock: string;
  combo_items: ComboItemRow[];
  category_id: string;
  subcategory_id: string;
};

export const emptyBannerForm = (placement: Placement = "home"): BannerFormState => ({
  placement,
  brand_id: "",
  coupon_id: "",
  product_id: "",
  title: "",
  subtitle: "",
  image_url: "",
  link_slug: "",
  sort_order: "0",
  is_active: true,
  combo_price: "",
  combo_mrp: "",
  combo_stock: "50",
  combo_items: [],
  category_id: "",
  subcategory_id: "",
});

export function AdminBannerForm({
  form,
  setForm,
  onSubmit,
  isPending,
}: {
  form: BannerFormState;
  setForm: (f: BannerFormState) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const fetchCategories = useAdminFn(getAdminCategories, getAdminCategoriesClient);
  const fetchProducts = useAdminFn(getAdminProducts, getAdminProductsClient);
  const listBrands = useAdminFn(adminListBrands, adminListBrandsClient);
  const listCoupons = useAdminFn(adminListCoupons, adminListCouponsClient);

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
  const { data: productData } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const catalogProducts = (productData?.products ?? []).filter((p) => !p.is_combo);
  const topCategories = categories.filter((c) => !c.parent_id);
  const subcategories = categories.filter((c) => c.parent_id === form.category_id);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
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
      {form.placement === "combos" && (
        <>
          <p className="rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-muted-foreground">
            Combo packs are purchasable products — they appear in Products, the chosen category and
            subcategory.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    category_id: v === "none" ? "" : v,
                    subcategory_id: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select category</SelectItem>
                  {topCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <Select
                value={form.subcategory_id || "none"}
                disabled={!form.category_id || subcategories.length === 0}
                onValueChange={(v) => setForm({ ...form, subcategory_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subcategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="combo-price">Combo price (₹)</Label>
              <Input
                id="combo-price"
                inputMode="decimal"
                required
                value={form.combo_price}
                onChange={(e) => setForm({ ...form, combo_price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="combo-mrp">MRP (₹)</Label>
              <Input
                id="combo-mrp"
                inputMode="decimal"
                value={form.combo_mrp}
                onChange={(e) => setForm({ ...form, combo_mrp: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="combo-stock">Stock</Label>
              <Input
                id="combo-stock"
                inputMode="numeric"
                value={form.combo_stock}
                onChange={(e) => setForm({ ...form, combo_stock: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items in this combo</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setForm({
                    ...form,
                    combo_items: [...form.combo_items, { product_id: "", quantity: "1" }],
                  })
                }
              >
                Add item
              </Button>
            </div>
            {form.combo_items.length === 0 && (
              <p className="text-xs text-muted-foreground">Add products included in this pack.</p>
            )}
            {form.combo_items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_auto] gap-2">
                <Select
                  value={item.product_id || "none"}
                  onValueChange={(v) => {
                    const combo_items = [...form.combo_items];
                    combo_items[index] = {
                      ...combo_items[index],
                      product_id: v === "none" ? "" : v,
                    };
                    setForm({ ...form, combo_items });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select product</SelectItem>
                    {catalogProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={(e) => {
                    const combo_items = [...form.combo_items];
                    combo_items[index] = { ...combo_items[index], quantity: e.target.value };
                    setForm({ ...form, combo_items });
                  }}
                  placeholder="Qty"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      ...form,
                      combo_items: form.combo_items.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {form.placement !== "combos" && (
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
        )}
        <div className={form.placement === "combos" ? "col-span-2" : ""}>
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Saving…"
          : form.placement === "combos"
            ? "Save combo pack"
            : "Save banner"}
      </Button>
    </form>
  );
}

function buildSavePayload(f: BannerFormState) {
  return {
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
    product_id: f.product_id || null,
    combo_price: f.placement === "combos" ? Number(f.combo_price || 0) : undefined,
    combo_mrp: f.placement === "combos" && f.combo_mrp ? Number(f.combo_mrp) : undefined,
    combo_stock: f.placement === "combos" ? Number(f.combo_stock || 50) : undefined,
    combo_items:
      f.placement === "combos"
        ? f.combo_items
            .filter((item) => item.product_id)
            .map((item) => ({
              product_id: item.product_id,
              quantity: Number(item.quantity || 1),
            }))
        : undefined,
    category_id: f.placement === "combos" ? f.category_id || null : undefined,
    subcategory_id: f.placement === "combos" ? f.subcategory_id || null : undefined,
  };
}

export { buildSavePayload };
