import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveAdminRider } from "@/lib/admin-platform.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/delivery/new")({
  component: NewRider,
});

function NewRider() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const saveRider = useServerFn(saveAdminRider);
  const [form, setForm] = useState({ name: "", phone: "", vehicle: "bike" });

  const saveMutation = useMutation({
    mutationFn: () => saveRider({ data: form }),
    onSuccess: () => {
      toast.success("Rider saved");
      qc.invalidateQueries({ queryKey: ["admin-riders"] });
      navigate({ to: "/admin/delivery" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/delivery" backLabel="Back to delivery" title="New rider">
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Button
          className="w-full"
          disabled={!form.name.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving…" : "Save rider"}
        </Button>
      </div>
    </AdminFormShell>
  );
}
