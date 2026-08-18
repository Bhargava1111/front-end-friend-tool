import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminProducts, saveAdminProduct } from "@/lib/admin.functions";
import { productFormToPayload, productToForm, type ProductForm } from "@/lib/admin-product-form";
import { AdminFormShell } from "@/components/admin-form-shell";
import { AdminProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = useParams({ from: "/admin/products/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProducts = useServerFn(getAdminProducts);
  const save = useServerFn(saveAdminProduct);
  const [form, setForm] = useState<ProductForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const product = data?.products.find((p) => p.id === id);

  useEffect(() => {
    if (product) setForm(productToForm(product));
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: productFormToPayload(form!) }),
    onSuccess: () => {
      toast.success("Product saved");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      navigate({ to: "/admin/products" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!product) {
    return (
      <AdminFormShell backTo="/admin/products" backLabel="Back to products" title="Product not found">
        <p className="text-sm text-muted-foreground">This product does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell backTo="/admin/products" backLabel="Back to products" title="Edit product">
      <AdminProductForm
        form={form}
        setForm={setForm}
        categories={data?.categories ?? []}
        onSubmit={() => saveMutation.mutate()}
        isPending={saveMutation.isPending}
      />
    </AdminFormShell>
  );
}
