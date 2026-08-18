import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment-failure")({
  component: PaymentFailurePage,
});

function PaymentFailurePage() {
  return (
    <PageShell className="grid place-items-center px-4">
      <div className="max-w-sm text-center">
        <XCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Payment failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. You can retry from checkout or choose cash on delivery.
        </p>
        <Button asChild className="mt-6 w-full rounded-xl">
          <Link to="/checkout">Try again</Link>
        </Button>
        <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
          <Link to="/cart">Back to cart</Link>
        </Button>
      </div>
    </PageShell>
  );
}
