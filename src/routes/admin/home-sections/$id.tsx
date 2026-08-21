import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { adminListHomeSectionsClient, adminSaveHomeSectionClient } from "@/lib/admin-client.functions";
import { toast } from "sonner";
import { adminListHomeSections, adminSaveHomeSection } from "@/lib/admin-extra.functions";
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
import { FALLBACK_RULES, SECTION_LAYOUTS, type HomeOfferSectionDef } from "@/lib/offer-sections";
import { Skeleton } from "@/components/skeletons";

export const Route = createFileRoute("/admin/home-sections/$id")({
  component: EditHomeSection,
});

function EditHomeSection() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useAdminFn(adminListHomeSections, adminListHomeSectionsClient);
  const save = useAdminFn(adminSaveHomeSection, adminSaveHomeSectionClient);
  const [form, setForm] = useState<Partial<HomeOfferSectionDef> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: () => list() as Promise<HomeOfferSectionDef[]>,
  });

  useEffect(() => {
    const row = data?.find((s) => s.id === id);
    if (row) setForm({ ...row });
  }, [data, id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id,
          ...form,
          title: form?.title?.trim(),
          max_products: Number(form?.max_products) || 12,
          sort_order: Number(form?.sort_order) || 0,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      toast.success("Section saved");
      navigate({ to: "/admin/home-sections" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <AdminFormShell title="Edit section" backTo="/admin/home-sections">
        <Skeleton className="h-64 w-full" />
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell title="Edit section" backTo="/admin/home-sections">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f!, title: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Key</Label>
          <Input value={form.key ?? ""} disabled className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Input
            value={form.subtitle ?? ""}
            onChange={(e) => setForm((f) => ({ ...f!, subtitle: e.target.value }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Layout</Label>
            <Select value={form.layout} onValueChange={(v) => setForm((f) => ({ ...f!, layout: v as HomeOfferSectionDef["layout"] }))}>
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
              onValueChange={(v) => setForm((f) => ({ ...f!, fallback_rule: v }))}
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
              value={form.see_all_tab ?? ""}
              onChange={(e) => setForm((f) => ({ ...f!, see_all_tab: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max price (₹)</Label>
            <Input
              type="number"
              min={1}
              value={form.max_price ?? 99}
              onChange={(e) => setForm((f) => ({ ...f!, max_price: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max products</Label>
            <Input
              type="number"
              value={form.max_products ?? 12}
              onChange={(e) => setForm((f) => ({ ...f!, max_products: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setForm((f) => ({ ...f!, sort_order: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f!, is_active: v }))}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.show_on_home ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f!, show_on_home: v }))}
            />
            Show on home page
          </label>
        </div>
        <Button
          className="rounded-xl"
          disabled={!form.title?.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save changes
        </Button>
      </div>
    </AdminFormShell>
  );
}
