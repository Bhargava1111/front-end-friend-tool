import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment-success")({
  validateSearch: (s: Record<string, unknown>) => ({
    orderId: (s.orderId as string) || "",
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { orderId } = Route.useSearch();

  return (
    <PageShell className="grid place-items-center px-4">
      <div className="max-w-sm text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-4 text-xl font-bold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your order has been confirmed.</p>
        {orderId && (
          <Button asChild className="mt-6 w-full rounded-xl">
            <Link to="/orders/$id" params={{ id: orderId }}>
              View order
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
          <Link to="/">Continue shopping</Link>
        </Button>
      </div>
    </PageShell>
  );
}
