import { createFileRoute } from "@tanstack/react-router";
import { Quote } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { StarRating } from "@/components/star-rating";
import { TESTIMONIALS } from "@/lib/content";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Customer Stories — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "What Chennai shoppers say about delivery speed, product quality and service at Sri Mahalakshmi Stores.",
      },
      { property: "og:title", content: "Customer Stories" },
      { property: "og:description", content: "Reviews from shoppers across Chennai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const average =
    Math.round((TESTIMONIALS.reduce((s, t) => s + t.rating, 0) / TESTIMONIALS.length) * 10) / 10;

  return (
    <PageShell>
      <TopBar title="Customer stories" backTo="/" />

      <section className="px-4 pt-4">
        <div className="rounded-2xl border border-border bg-card p-5 text-center card-elevated">
          <p className="text-3xl font-bold text-foreground">{average}</p>
          <StarRating value={average} size={16} className="mt-1.5 justify-center" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Based on {TESTIMONIALS.length} recent shopper reviews
          </p>
        </div>
      </section>

      <div className="space-y-3 p-4">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.05}>
            <figure className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <Quote className="h-5 w-5 text-accent" />
              <blockquote className="mt-2 text-sm leading-relaxed text-foreground">{t.quote}</blockquote>
              <figcaption className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.location}</p>
                </div>
                <StarRating value={t.rating} />
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </PageShell>
  );
}
