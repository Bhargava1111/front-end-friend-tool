import { createFileRoute } from "@tanstack/react-router";
import { PageShell, TopBar } from "@/components/page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "The terms that apply when you order groceries and pooja essentials from Sri Mahalakshmi Stores.",
      },
      { property: "og:title", content: "Terms of Service — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Ordering, pricing, delivery, cancellation and return terms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    title: "Using the service",
    body: "You need an account to place an order. Keep your sign-in details private — orders placed from your account are treated as placed by you.",
  },
  {
    title: "Pricing and availability",
    body: "Prices shown include applicable taxes unless stated separately at checkout. Stock is limited and an item may sell out between adding it to your cart and confirmation; in that case we contact you before packing.",
  },
  {
    title: "Delivery",
    body: "We deliver only within the published service radius of each outlet. Express and slot times are best-effort estimates and can move during heavy rain, festivals or traffic disruption.",
  },
  {
    title: "Payment",
    body: "Cash on delivery is currently the live payment method. Other options shown at checkout are being enabled and are clearly marked as unavailable until then.",
  },
  {
    title: "Cancellations",
    body: "You can cancel an order yourself while it is still pending. Once confirmed and packed, contact support — perishables that have already been packed may not be cancellable.",
  },
  {
    title: "Returns and refunds",
    body: "Raise a return within 24 hours of delivery for damaged, missing or incorrect items. Approved refunds are credited to your store wallet or returned in cash by the delivery partner.",
  },
  {
    title: "Changes to these terms",
    body: "We may update these terms as the service grows. Material changes will be announced in the app before they take effect.",
  },
];

function TermsPage() {
  return (
    <PageShell>
      <TopBar title="Terms of service" subtitle="Updated July 2026" backTo="/" />
      <article className="space-y-5 p-4 pb-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-sm font-bold text-foreground">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
