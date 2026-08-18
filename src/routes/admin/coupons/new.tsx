import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminSaveCoupon } from "@/lib/admin-extra.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "@/components/image-upload";

export const Route = createFileRoute("/admin/coupons/new")({
  component: NewCoupon,
});

const blank = {
  code: "",
  title: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_order: 299,
  max_discount: "",
  usage_limit: "",
  banner_url: "",
  is_active: true,
};

function NewCoupon() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(adminSaveCoupon);
  const [form, setForm] = useState({ ...blank });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          code: form.code,
          title: form.title.trim(),
          description: form.description,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value) || 0,
          min_order: Number(form.min_order) || 0,
          max_discount: form.max_discount === "" ? null : Number(form.max_discount),
          usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
          banner_url: form.banner_url,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-meta"] });
      toast.success("Coupon created");
      navigate({ to: "/admin/coupons" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/coupons" backLabel="Back to coupons" title="New coupon">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="c-code">Code</Label>
          <Input
            id="c-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="FESTIVE20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-title">Title</Label>
          <Input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-desc">Description</Label>
          <Input
            id="c-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-type">Discount type</Label>
          <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
            <SelectTrigger id="c-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage off</SelectItem>
              <SelectItem value="flat">Flat amount off</SelectItem>
              <SelectItem value="free_shipping">Free delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-value">Value</Label>
            <Input
              id="c-value"
              type="number"
              value={form.discount_value}
              disabled={form.discount_type === "free_shipping"}
              onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-min">Min order ₹</Label>
            <Input
              id="c-min"
              type="number"
              value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-max">Max discount ₹</Label>
            <Input
              id="c-max"
              type="number"
              value={form.max_discount}
              placeholder="none"
              onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-limit">Usage limit</Label>
            <Input
              id="c-limit"
              type="number"
              value={form.usage_limit}
              placeholder="unlimited"
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
            />
          </div>
        </div>
        <ImageUploadField
          label="Coupon banner"
          folder="coupons"
          value={form.banner_url}
          onChange={(url) => setForm({ ...form, banner_url: url })}
          hint="Appears on the coupon card in “Coupons for you” and the coupons page."
        />
        <div className="flex items-center gap-2">
          <Switch
            id="c-active"
            checked={form.is_active}
            onCheckedChange={(v) => setForm({ ...form, is_active: v })}
          />
          <Label htmlFor="c-active">Active</Label>
        </div>
        <Button
          className="w-full rounded-xl"
          disabled={!form.code.trim() || !form.title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save coupon
        </Button>
      </div>
    </AdminFormShell>
  );
}
