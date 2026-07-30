import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { HELP_TOPICS } from "@/lib/content";
import { useStorefront } from "@/hooks/use-storefront";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Get help with orders, delivery, payments, returns and your account at Sri Mahalakshmi Stores.",
      },
      { property: "og:title", content: "Help Center — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Support topics and contact options for shoppers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { settings } = useStorefront();
  return (
    <PageShell>
      <TopBar title="Help center" backTo="/" />

      <section className="px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
          <LifeBuoy className="h-7 w-7" />
          <h2 className="mt-3 text-base font-bold">How can we help?</h2>
          <p className="mt-1 text-xs text-primary-foreground/80">
            Browse a topic below, read the FAQ, or reach a person directly.
          </p>
        </div>
      </section>

      <section className="space-y-2.5 p-4">
        {HELP_TOPICS.map((t) => (
          <Link
            key={t.title}
            to="/faq"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.detail}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 px-4 pb-8">
        <a
          href={`tel:${settings.support_phone}`}
          className="rounded-2xl border border-border bg-card p-4 text-center card-elevated"
        >
          <Phone className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-xs font-semibold">Call support</p>
        </a>
        <a
          href={`mailto:${settings.support_email}`}
          className="rounded-2xl border border-border bg-card p-4 text-center card-elevated"
        >
          <Mail className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-xs font-semibold">Email us</p>
        </a>
        <Link to="/feedback" className="rounded-2xl border border-border bg-card p-4 text-center card-elevated">
          <MessageCircle className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-xs font-semibold">Share feedback</p>
        </Link>
        <Link to="/contact" className="rounded-2xl border border-border bg-card p-4 text-center card-elevated">
          <LifeBuoy className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-xs font-semibold">Contact form</p>
        </Link>
      </section>
    </PageShell>
  );
}
