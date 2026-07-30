import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, CreditCard, Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-shop";
import { useStorefront } from "@/hooks/use-storefront";
import { getAddresses, placeOrder } from "@/lib/shop.functions";
import { PageShell, TopBar } from "@/components/page-shell";
import { FulfilmentMap } from "@/components/fulfilment-map";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { cartSubtotal, computeTotals, couponError, deliverySlots, PAYMENT_METHODS } from "@/lib/commerce";
import { useAppliedCoupon } from "@/lib/client-store";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Sri Mahalakshmi Stores" },
      { name: "description", content: "Confirm your delivery address, slot and payment method." },
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
  const { settings, coupons } = useStorefront();
  const { code: appliedCode, clear: clearCoupon } = useAppliedCoupon();
  const fetchAddresses = useServerFn(getAddresses);
  const submit = useServerFn(placeOrder);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const slots = useMemo(() => deliverySlots(), []);
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "express");
  const [payment, setPayment] = useState("cod");

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
  const subtotal = cartSubtotal(items);
  const coupon = coupons.find((c) => c.code === appliedCode) ?? null;
  const validCoupon = coupon && !couponError(coupon, subtotal) ? coupon : null;
  const totals = computeTotals({ subtotal, coupon: validCoupon, settings });
  const slot = slots.find((s) => s.id === slotId) ?? slots[0];

  const orderMutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          addressId: addressId!,
          notes: notes || undefined,
          couponCode: validCoupon?.code,
          deliverySlot: slot?.label,
          paymentMethod: payment,
        },
      }),
    onSuccess: (res) => {
      clearCoupon();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Order ${res.orderNumber} placed!`);
      navigate({ to: "/orders/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell withCartBar={false}>
      <TopBar title="Checkout" subtitle="Secure & simple" />

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
                  addressId === a.id ? "border-primary bg-primary-soft" : "border-border bg-card",
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
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" /> Delivery slot
        </h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {slots.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={slotId === s.id}
              onClick={() => setSlotId(s.id)}
              className={cn(
                "w-40 shrink-0 rounded-2xl border p-3 text-left transition-colors",
                slotId === s.id ? "border-primary bg-primary-soft" : "border-border bg-card",
              )}
            >
              <p className="text-xs font-semibold">{s.day}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.window}</p>
              {s.soon && (
                <span className="mt-1.5 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  Fastest
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4 text-primary" /> Payment method
        </h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={!m.available}
              aria-pressed={payment === m.id}
              onClick={() => setPayment(m.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-50",
                payment === m.id ? "border-primary bg-primary-soft" : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  payment === m.id ? "border-primary" : "border-muted-foreground",
                )}
              >
                {payment === m.id && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
              {!m.available && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                  Coming soon
                </span>
              )}
            </button>
          ))}
        </div>
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
          {totals.discount > 0 && (
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-primary">
              <span>Coupon {validCoupon?.code}</span>
              <span className="font-medium">−{formatINR(totals.discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">
              {totals.deliveryFee === 0 ? "FREE" : formatINR(totals.deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Taxes &amp; charges</span>
            <span className="font-medium">{formatINR(totals.tax)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatINR(totals.total)}</span>
          </div>
        </div>
      </section>

      <section className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Delivery notes (optional)</h2>
        <Textarea
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Landmark, preferred time, etc."
          className="rounded-xl"
        />
      </section>

      <div className="flex items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
        <Truck className="h-4 w-4 text-accent" />
        {payment === "cod" ? "Pay cash when your order arrives." : "Online payments launch soon."}
      </div>

      <div className="p-4">
        <Button
          className="h-12 w-full rounded-xl text-base"
          disabled={!addressId || items.length === 0 || orderMutation.isPending}
          onClick={() => orderMutation.mutate()}
        >
          {orderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Place order · {formatINR(totals.total)}
        </Button>
      </div>
    </PageShell>
  );
}
