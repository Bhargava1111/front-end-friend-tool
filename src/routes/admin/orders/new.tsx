import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminProductsClient, getAdminCustomersClient, createAdminOrderClient } from "@/lib/admin-client.functions";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createAdminOrder, getAdminProducts, getAdminCustomers } from "@/lib/admin.functions";
import { formatINR } from "@/lib/format";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/orders/new")({
  component: NewOrder,
});

type Line = { product_id: string; quantity: number };

function NewOrder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProducts = useAdminFn(getAdminProducts, getAdminProductsClient);
  const fetchCustomers = useAdminFn(getAdminCustomers, getAdminCustomersClient);
  const create = useAdminFn(createAdminOrder, createAdminOrderClient);

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const { data: catalog } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
  });

  const products = catalog?.products ?? [];
  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = products.find((x) => x.id === l.product_id);
        return sum + (p ? Number(p.price) * l.quantity : 0);
      }, 0),
    [lines, products],
  );

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          user_id: userId,
          recipient_name: name,
          phone,
          address_text: address,
          notes: notes || null,
          items: lines,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Order ${res.order_number} created`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      navigate({ to: "/admin/orders" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/orders" backLabel="Back to orders" title="Create order">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!userId) return toast.error("Select a customer");
          if (lines.length === 0) return toast.error("Add at least one product");
          mutation.mutate();
        }}
      >
        <div>
          <Label>Customer</Label>
          <Select
            value={userId}
            onValueChange={(v) => {
              setUserId(v);
              const c = customers.find((x) => x.id === v);
              if (c) {
                setName(c.full_name ?? "");
                setPhone(c.phone ?? "");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name ?? "Customer"} {c.phone ? `· ${c.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="o-name">Recipient</Label>
            <Input
              id="o-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="o-phone">Phone</Label>
            <Input
              id="o-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="o-address">Delivery address</Label>
          <Textarea
            id="o-address"
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2 rounded-2xl border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() =>
                setLines([...lines, { product_id: products[0]?.id ?? "", quantity: 1 }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
          {lines.length === 0 && (
            <p className="text-xs text-muted-foreground">No items added yet.</p>
          )}
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={l.product_id}
                onValueChange={(v) =>
                  setLines(lines.map((x, xi) => (xi === i ? { ...x, product_id: v } : x)))
                }
              >
                <SelectTrigger className="flex-1 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatINR(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-16"
                inputMode="numeric"
                value={l.quantity}
                onChange={(e) =>
                  setLines(
                    lines.map((x, xi) =>
                      xi === i
                        ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                        : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => setLines(lines.filter((_, xi) => xi !== i))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="pt-1 text-right text-sm font-semibold text-foreground">
            Subtotal {formatINR(subtotal)}
          </p>
        </div>

        <div>
          <Label htmlFor="o-notes">Notes</Label>
          <Input id="o-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create order"}
        </Button>
      </form>
    </AdminFormShell>
  );
}
