import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-shop";
import { getAddresses, placeOrder } from "@/lib/shop.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "@/lib/format";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Sri Mahalakshmi Stores" },
      { name: "description", content: "Confirm your delivery address and place your order." },
      { property: "og:title", content: "Checkout — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Cash on delivery checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: lines } = useCart();
  const fetchAddresses = useServerFn(getAddresses);
  const submit = useServerFn(placeOrder);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetchAddresses() as Promise<Address[]>,
  });

  useEffect(() => {
    if (!addressId && addresses?.length) {
      setAddressId((addresses.find((a) => a.is_default) ?? addresses[0]).id);
    }
  }, [addresses, addressId]);

  const items = lines ?? [];
  const subtotal = items.reduce((s, l) => s + Number(l.product.price) * l.quantity, 0);
  const delivery = subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0 ? 0 : DELIVERY_FEE;

  const orderMutation = useMutation({
    mutationFn: () => submit({ data: { addressId: addressId!, notes: notes || undefined } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Order ${res.orderNumber} placed!`);
      navigate({ to: "/orders/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell>
      <TopBar title="Checkout" subtitle="Cash on delivery" />

      <section className="px-4 pt-4">
        <FulfilmentMap />
      </section>

      <section className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Delivery address
          </h2>
          <Link to="/addresses" className="text-xs font-semibold text-primary">
            Manage
          </Link>
        </div>

        {addresses && addresses.length > 0 ? (
          <div className="space-y-2.5">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAddressId(a.id)}
                className={cn(
                  "w-full rounded-2xl border p-3 text-left text-sm transition-colors",
                  addressId === a.id
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {a.label}
                  </span>
                  <span className="font-semibold">{a.recipient_name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.phone}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No saved address yet.
            <div className="mt-3">
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/addresses">Add address</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="px-4">
        <h2 className="mb-2 text-sm font-semibold">Order summary</h2>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm card-elevated">
          {items.map((l) => (
            <div key={l.id} className="flex justify-between py-1">
              <span className="min-w-0 truncate text-muted-foreground">
                {l.product.name} × {l.quantity}
              </span>
              <span className="ml-3 font-medium">
                {formatINR(Number(l.product.price) * l.quantity)}
              </span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">{delivery === 0 ? "FREE" : formatINR(delivery)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatINR(subtotal + delivery)}</span>
          </div>
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Delivery notes (optional)</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Landmark, preferred time, etc."
          className="rounded-xl"
        />
      </section>

      <div className="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
        <Truck className="h-4 w-4 text-accent" /> Pay cash when your order arrives.
      </div>

      <div className="p-4">
        <Button
          className="h-12 w-full rounded-xl text-base"
          disabled={!addressId || items.length === 0 || orderMutation.isPending}
          onClick={() => orderMutation.mutate()}
        >
          {orderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Place order · {formatINR(subtotal + delivery)}
        </Button>
      </div>
    </PageShell>
  );
}
