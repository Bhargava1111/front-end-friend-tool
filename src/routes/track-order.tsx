import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Truck, Check, MapPin, Phone } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-shop";
import { getOrders } from "@/lib/shop.functions";
import { STATUS_LABEL, STATUS_STEPS } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Enter your order number to track delivery status in real time.",
      },
      { property: "og:title", content: "Track Order — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Real-time order tracking." },
    ],
  }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const { session } = useSession();
  const [orderNumber, setOrderNumber] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders() as Promise<Order[]>,
    enabled: !!session,
  });

  const matched = searched
    ? (orders as Order[]).find(
        (o) =>
          o.order_number?.toLowerCase() === orderNumber.trim().toLowerCase() ||
          o.id === orderNumber.trim(),
      )
    : null;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setSearched(true);
  }

  const currentStep = matched
    ? STATUS_STEPS.indexOf(matched.status as OrderStatus)
  : -1;

  return (
    <PageShell>
      <TopBar title="Track order" subtitle="Real-time delivery updates" backTo="/" />

      <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground lg:mx-0">
        <PackageSearch className="h-8 w-8" />
        <h1 className="mt-3 text-xl font-bold">Where is my order?</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Enter your order number from the confirmation SMS or email
        </p>
      </section>

      <form onSubmit={handleSearch} className="mt-5 space-y-3 px-4 lg:px-0">
        <div>
          <Label htmlFor="orderNumber">Order number</Label>
          <Input
            id="orderNumber"
            value={orderNumber}
            onChange={(e) => {
              setOrderNumber(e.target.value);
              setSearched(false);
            }}
            placeholder="e.g. SMS-20240821-0042"
            className="mt-1.5 rounded-xl"
          />
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={!orderNumber.trim()}>
          Track order
        </Button>
      </form>

      {!session && (
        <Reveal className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 lg:mx-0">
          <p className="text-sm font-semibold text-foreground">Sign in for faster tracking</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Logged-in customers can see all orders without entering a number
          </p>
          <Link to="/auth">
            <Button variant="outline" className="mt-3 rounded-xl text-xs">
              Sign in
            </Button>
          </Link>
        </Reveal>
      )}

      {searched && !matched && (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title="Order not found"
          description={
            session
              ? "No order matches that number. Check the SMS confirmation and try again."
              : "Sign in to track your orders, or double-check the order number."
          }
          action={
            !session ? (
              <Link to="/auth">
                <Button className="rounded-xl">Sign in to track</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {matched && (
        <Reveal className="mt-5 space-y-4 px-4 lg:px-0">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{matched.order_number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(matched.created_at)}</p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold capitalize text-primary">
                {STATUS_LABEL[matched.status as OrderStatus] ?? matched.status}
              </span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">{formatINR(matched.total)}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Delivery progress</h2>
            <div className="mt-4 space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <div key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
                          done
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground",
                          active && "ring-2 ring-primary/30 ring-offset-2",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={cn("w-0.5 flex-1 min-h-6", done ? "bg-primary" : "bg-border")}
                        />
                      )}
                    </div>
                    <div className="pb-5 pt-1.5">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL[step]}
                      </p>
                      {active && step === "out_for_delivery" && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                          <Truck className="h-3 w-3" /> Rider is on the way
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {matched.shipping_address && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery address
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {(matched as Order & { shipping_address?: string }).shipping_address ??
                  matched.recipient_name}
              </p>
            </div>
          )}

          <Link to="/orders/$id" params={{ id: matched.id }}>
            <Button variant="outline" className="w-full rounded-xl">
              View full order details
            </Button>
          </Link>
        </Reveal>
      )}

      <Reveal className="mx-4 mt-8 mb-6 rounded-2xl border border-border bg-secondary/30 p-4 lg:mx-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Phone className="h-4 w-4 text-primary" /> Need help?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Call us at +91 90000 12345 or raise a ticket from your account
        </p>
        <Link to="/support" className="mt-2 inline-block text-xs font-semibold text-primary">
          Contact support
        </Link>
      </Reveal>
    </PageShell>
  );
}
