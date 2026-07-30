import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorefront } from "@/hooks/use-storefront";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "We'll be right back — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Sri Mahalakshmi Stores is briefly offline for scheduled maintenance. Ordering resumes shortly.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Scheduled maintenance" },
      { property: "og:description", content: "We're carrying out a short maintenance window." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { settings } = useStorefront();
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-accent-foreground">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">We&apos;ll be right back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The store is briefly offline while we restock the system. Orders already placed are safe and
          will be delivered as scheduled.
        </p>
        <div className="mt-6 space-y-2">
          <Button asChild className="h-11 w-full rounded-xl">
            <a href={`tel:${settings.support_phone}`}>Call {settings.support_phone}</a>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-xl">
            <Link to="/">Try the store again</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
