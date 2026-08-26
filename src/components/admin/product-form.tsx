import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField, MultiImageUpload } from "@/components/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emptyPriceTier,
  emptyVariant,
  PACK_PRESETS,
  syncVariantPatch,
  UNITS,
  type ProductForm,
  type PriceTierRow,
  type VariantRow,
} from "@/lib/admin-product-form";

type Category = { id: string; name: string };

export function AdminProductForm({
  form,
  setForm,
  categories,
  catalogProducts = [],
  onSubmit,
  isPending,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  categories: Category[];
  catalogProducts?: Array<{ id: string; name: string; is_combo?: boolean }>;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
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
        <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
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
      <ImageUploadField
        label="Main product image"
        folder="products"
        aspect="aspect-square max-w-[220px]"
        value={form.image_url}
        onChange={(url) => setForm({ ...form, image_url: url })}
      />
      <div>
        <Label htmlFor="p-video">Video URL (MP4 or YouTube embed)</Label>
        <Input
          id="p-video"
          placeholder="https://…"
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
        />
      </div>
      <MultiImageUpload
        label="Gallery images"
        folder="products"
        values={form.gallery.split("\n").map((v) => v.trim()).filter(Boolean)}
        onChange={(urls) => setForm({ ...form, gallery: urls.join("\n") })}
      />
      <div className="rounded-2xl border border-border bg-secondary/40 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch
            checked={form.is_combo}
            onCheckedChange={(v) => setForm({ ...form, is_combo: v })}
          />
          Combo product (frequently bought together)
        </label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Shoppers see included items and can add the combo in one tap.
        </p>
        {form.is_combo && (
          <div className="mt-3 space-y-2">
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
            {form.combo_items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_72px_auto] gap-2">
                <Select
                  value={item.product_id || "none"}
                  onValueChange={(v) => {
                    const combo_items = [...form.combo_items];
                    combo_items[index] = { ...combo_items[index], product_id: v === "none" ? "" : v };
                    setForm({ ...form, combo_items });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select product</SelectItem>
                    {catalogProducts
                      .filter((p) => p.id !== form.id && !p.is_combo)
                      .map((p) => (
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
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-shelf">Shelf life</Label>
          <Input
            id="p-shelf"
            placeholder="6 months"
            value={form.shelf_life}
            onChange={(e) => setForm({ ...form, shelf_life: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="p-origin">Origin</Label>
          <Input
            id="p-origin"
            placeholder="India"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="p-benefits">Benefits (one per line)</Label>
        <Textarea
          id="p-benefits"
          rows={3}
          placeholder={"100% pure and unadulterated\nSourced from certified farms"}
          value={form.benefits}
          onChange={(e) => setForm({ ...form, benefits: e.target.value })}
        />
      </div>

      <div className="rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Qty price tiers</Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Shown on product page (Qty / ₹/pc / Profit). Example: 1–2 @ ₹230.99, 3–999 @ ₹226.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm({
                ...form,
                price_tiers: [
                  ...form.price_tiers,
                  {
                    ...emptyPriceTier,
                    min_qty: form.price_tiers.length === 0 ? "1" : "3",
                    max_qty: form.price_tiers.length === 0 ? "2" : "999",
                    unit_price: form.price,
                  },
                ],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add tier
          </Button>
        </div>

        {form.price_tiers.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No qty tiers yet — storefront will show default price only.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {form.price_tiers.map((tier, i) => {
            const update = (patch: Partial<PriceTierRow>) =>
              setForm({
                ...form,
                price_tiers: form.price_tiers.map((row, idx) =>
                  idx === i ? { ...row, ...patch } : row,
                ),
              });
            const mrp = Number(form.mrp || 0);
            const unit = Number(tier.unit_price || 0);
            const profit =
              mrp > 0 && unit > 0 && mrp > unit
                ? (((mrp - unit) / mrp) * 100).toFixed(2)
                : null;
            return (
              <div key={i} className="rounded-xl bg-secondary/50 p-2.5">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Min qty</Label>
                    <Input
                      aria-label={`Tier ${i + 1} min qty`}
                      inputMode="numeric"
                      value={tier.min_qty}
                      onChange={(e) => update({ min_qty: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Max qty</Label>
                    <Input
                      aria-label={`Tier ${i + 1} max qty`}
                      inputMode="numeric"
                      value={tier.max_qty}
                      onChange={(e) => update({ max_qty: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">₹ / pc</Label>
                    <Input
                      aria-label={`Tier ${i + 1} unit price`}
                      inputMode="decimal"
                      placeholder={form.price || "Price"}
                      value={tier.unit_price}
                      onChange={(e) => update({ unit_price: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove tier ${i + 1}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        price_tiers: form.price_tiers.filter((_, idx) => idx !== i),
                      })
                    }
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {profit && (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Profit vs MRP: {profit}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between">
          <Label>Pack sizes / variants</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setForm({ ...form, variants: [...form.variants, { ...emptyVariant }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PACK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  variants: form.variants.some((v) => v.label === preset.label)
                    ? form.variants
                    : [
                        ...form.variants,
                        {
                          ...emptyVariant,
                          ...preset,
                          price: form.price,
                          mrp: form.mrp,
                          stock: form.stock,
                          is_default: form.variants.length === 0,
                        },
                      ],
                })
              }
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            >
              + {preset.label}
            </button>
          ))}
        </div>

        {form.variants.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No pack sizes yet — the base price and weight are used on the storefront.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {form.variants.map((v, i) => {
            const update = (patch: Partial<VariantRow>) =>
              setForm({
                ...form,
                variants: form.variants.map((row, idx) =>
                  idx === i ? syncVariantPatch(row, patch) : row,
                ),
              });
            return (
              <div key={i} className="rounded-xl bg-secondary/50 p-2.5">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] text-muted-foreground">Pack label</Label>
                    <Input
                      aria-label="Pack label"
                      placeholder="500 g"
                      value={v.label}
                      onChange={(e) => update({ label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Qty</Label>
                    <Input
                      aria-label="Pack size value"
                      type="text"
                      inputMode="decimal"
                      placeholder="500"
                      className="w-20"
                      value={v.unit_value}
                      onChange={(e) => update({ unit_value: e.target.value })}
                      onBlur={() =>
                        update({
                          unit_value: v.unit_value.trim() || "1",
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Unit</Label>
                    <Select value={v.unit} onValueChange={(val) => update({ unit: val })}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove pack ${i + 1}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        variants: form.variants.filter((_, idx) => idx !== i),
                      })
                    }
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    aria-label="Pack price"
                    inputMode="decimal"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) => update({ price: e.target.value })}
                  />
                  <Input
                    aria-label="Pack MRP"
                    inputMode="decimal"
                    placeholder="MRP"
                    value={v.mrp}
                    onChange={(e) => update({ mrp: e.target.value })}
                  />
                  <Input
                    aria-label="Pack stock"
                    inputMode="numeric"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => update({ stock: e.target.value })}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    aria-label="Pack SKU"
                    placeholder="SKU"
                    value={v.sku}
                    onChange={(e) => update({ sku: e.target.value })}
                  />
                  <ImageUploadField
                    label="Pack image"
                    folder="variants"
                    aspect="aspect-square"
                    value={v.image_url}
                    onChange={(url) => update({ image_url: url })}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={v.is_default}
                      onCheckedChange={() =>
                        setForm({
                          ...form,
                          variants: form.variants.map((row, idx) => ({
                            ...row,
                            is_default: idx === i,
                          })),
                        })
                      }
                    />
                    Default
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={(val) => update({ is_active: val })}
                    />
                    Active
                  </label>
                </div>
              </div>
            );
          })}
        </div>
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save product"}
      </Button>
    </form>
  );
}
