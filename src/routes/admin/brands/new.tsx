import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminSaveBrand } from "@/lib/admin-extra.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/image-upload";

export const Route = createFileRoute("/admin/brands/new")({
  component: NewBrand,
});

const blank = {
  name: "",
  slug: "",
  tagline: "",
  logo_url: "",
  banner_url: "",
  sort_order: 0,
  is_active: true,
};

function NewBrand() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(adminSaveBrand);
  const [form, setForm] = useState({ ...blank });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          name: form.name.trim(),
          slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          tagline: form.tagline,
          logo_url: form.logo_url,
          banner_url: form.banner_url,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-meta"] });
      queryClient.invalidateQueries({ queryKey: ["brand-directory"] });
      toast.success("Brand added");
      navigate({ to: "/admin/brands" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/brands" backLabel="Back to brands" title="New brand">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="b-name">Name</Label>
          <Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-slug">Slug</Label>
          <Input
            id="b-slug"
            value={form.slug}
            placeholder="auto from name"
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-tag">Tagline</Label>
          <Input id="b-tag" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <ImageUploadField
          label="Brand logo"
          folder="brands"
          aspect="aspect-square max-w-[160px]"
          value={form.logo_url}
          onChange={(url) => setForm({ ...form, logo_url: url })}
        />
        <ImageUploadField
          label="Brand banner"
          folder="brands"
          value={form.banner_url}
          onChange={(url) => setForm({ ...form, banner_url: url })}
          hint="Shown behind the brand on the Featured brands rail and brands page."
        />
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="b-sort">Sort order</Label>
            <Input
              id="b-sort"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="b-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Label htmlFor="b-active">Active</Label>
          </div>
        </div>
        <Button
          className="w-full rounded-xl"
          disabled={!form.name.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save brand
        </Button>
      </div>
    </AdminFormShell>
  );
}
