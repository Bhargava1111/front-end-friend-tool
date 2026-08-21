import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { adminSaveHomeSectionClient } from "@/lib/admin-client.functions";
import { toast } from "sonner";
import { adminSaveHomeSection } from "@/lib/admin-extra.functions";
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
import { FALLBACK_RULES, SECTION_LAYOUTS } from "@/lib/offer-sections";

export const Route = createFileRoute("/admin/home-sections/new")({
  component: NewHomeSection,
});

const blank = {
  title: "",
  key: "",
  subtitle: "",
  layout: "rail",
  fallback_rule: "manual",
  see_all_tab: "",
  max_price: 99,
  max_products: 12,
  sort_order: 0,
  is_active: true,
  show_on_home: true,
};

function NewHomeSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useAdminFn(adminSaveHomeSection, adminSaveHomeSectionClient);
  const [form, setForm] = useState({ ...blank });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        layout: form.layout,
        fallback_rule: form.fallback_rule,
        see_all_tab: form.see_all_tab.trim(),
        max_price: Number(form.max_price) || 99,
        max_products: Number(form.max_products) || 12,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        show_on_home: form.show_on_home,
      };
      const key = form.key.trim();
      if (key) payload.key = key;
      return save({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      toast.success("Section created");
      navigate({ to: "/admin/home-sections" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell title="New home section" backTo="/admin/home-sections">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Flash sale"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Key (slug)</Label>
          <Input
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="flash_sale — auto-generated if empty"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Input
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            placeholder="Optional description on home"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Layout</Label>
            <Select value={form.layout} onValueChange={(v) => setForm((f) => ({ ...f, layout: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_LAYOUTS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fallback when empty</Label>
            <Select
              value={form.fallback_rule}
              onValueChange={(v) => setForm((f) => ({ ...f, fallback_rule: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FALLBACK_RULES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>See all tab</Label>
            <Input
              value={form.see_all_tab}
              onChange={(e) => setForm((f) => ({ ...f, see_all_tab: e.target.value }))}
              placeholder="flash, today, budget…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max price (₹)</Label>
            <Input
              type="number"
              min={1}
              value={form.max_price}
              onChange={(e) => setForm((f) => ({ ...f, max_price: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max products</Label>
            <Input
              type="number"
              min={1}
              max={40}
              value={form.max_products}
              onChange={(e) => setForm((f) => ({ ...f, max_products: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.show_on_home}
              onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_home: v }))}
            />
            Show on home page
          </label>
        </div>
        <Button
          className="rounded-xl"
          disabled={!form.title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Create section
        </Button>
      </div>
    </AdminFormShell>
  );
}
