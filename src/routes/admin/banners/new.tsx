import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { saveAdminBannerClient } from "@/lib/admin-client.functions";
import { toast } from "sonner";
import { saveAdminBanner } from "@/lib/admin.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import {
  AdminBannerForm,
  emptyBannerForm,
  buildSavePayload,
  type BannerFormState,
  type Placement,
} from "@/components/admin-banner-form";

export const Route = createFileRoute("/admin/banners/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    placement: (search.placement as Placement) || "home",
  }),
  component: NewBanner,
});

function NewBanner() {
  const { placement } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useAdminFn(saveAdminBanner, saveAdminBannerClient);
  const [form, setForm] = useState<BannerFormState>(() => emptyBannerForm(placement));

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

  const title = form.placement === "combos" ? "New combo pack" : "New banner";

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
