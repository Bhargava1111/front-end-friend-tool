import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Leaf, ShieldCheck, Truck } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "A family-run Chennai grocery and pooja store since 1978, now delivering fresh staples and ritual essentials to your door.",
      },
      { property: "og:title", content: "About Sri Mahalakshmi Stores" },
      {
        property: "og:description",
        content: "Family-run since 1978 — groceries and pooja essentials delivered across Chennai.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  { icon: Leaf, title: "Sourced fresh", body: "Staples and produce restocked daily from trusted mills and farms." },
  { icon: ShieldCheck, title: "Honest pricing", body: "The same price you would pay at the counter — no delivery mark-up." },
  { icon: Truck, title: "Fast, careful delivery", body: "Express delivery within 90 minutes across our service areas." },
  { icon: Heart, title: "Ritual respect", body: "Pooja items handled, stored and packed the way tradition expects." },
];

function AboutPage() {
  return (
    <PageShell>
      <TopBar title="About us" backTo="/" />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/85 px-5 pb-8 pt-7 text-primary-foreground">
        <h2 className="text-xl font-bold leading-snug">
          A neighbourhood store that grew up, without losing the neighbourhood.
        </h2>
        <p className="mt-3 text-sm text-primary-foreground/80">
          Sri Mahalakshmi Stores opened on a corner in T. Nagar in 1978 with two shelves of rice and a
          box of camphor. Three generations later we run four outlets across Chennai and deliver the
          same shortlist of things families actually need — every day.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3 px-4 py-5">
        {[
          { value: "48 yrs", label: "Serving Chennai" },
          { value: "4", label: "Neighbourhood outlets" },
          { value: "1,200+", label: "Orders a week" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center card-elevated">
            <p className="text-base font-bold text-primary">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 px-4">
        <h2 className="text-base font-bold">What we care about</h2>
        {VALUES.map((v, i) => (
          <Reveal key={v.title} delay={i * 0.05}>
            <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 card-elevated">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{v.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{v.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="p-4">
        <div className="rounded-2xl bg-accent-soft p-5 text-center">
          <h2 className="text-sm font-bold text-foreground">Come say hello</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Find your nearest outlet and its delivery radius.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="h-11 rounded-xl">
              <Link to="/stores">Store locator</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
