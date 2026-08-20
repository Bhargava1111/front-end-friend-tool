import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminProductsClient, saveAdminProductClient } from "@/lib/admin-client.functions";
import { toast } from "sonner";
import { getAdminProducts, saveAdminProduct } from "@/lib/admin.functions";
import { emptyProductForm, productFormToPayload } from "@/lib/admin-product-form";
import { AdminFormShell } from "@/components/admin-form-shell";
import { AdminProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProducts = useAdminFn(getAdminProducts, getAdminProductsClient);
  const save = useAdminFn(saveAdminProduct, saveAdminProductClient);
  const [form, setForm] = useState(emptyProductForm);

  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const saveMutation = useMutation({
    mutationFn: () => save({ data: productFormToPayload(form) }),
    onSuccess: () => {
      toast.success("Product saved");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      navigate({ to: "/admin/products" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/products" backLabel="Back to products" title="New product">
      <AdminProductForm
        form={form}
        setForm={setForm}
        categories={data?.categories ?? []}
        catalogProducts={data?.products ?? []}
        onSubmit={() => saveMutation.mutate()}
        isPending={saveMutation.isPending}
      />
    </AdminFormShell>
  );
}
