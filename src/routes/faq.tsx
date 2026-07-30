import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { FAQS } from "@/lib/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Answers on delivery areas, slots, payments, cancellations and returns at Sri Mahalakshmi Stores.",
      },
      { property: "og:title", content: "Frequently Asked Questions" },
      { property: "og:description", content: "Delivery, payment, order and account questions answered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [q, setQ] = useState("");
  const filtered = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(q.toLowerCase()) ||
      f.answer.toLowerCase().includes(q.toLowerCase()),
  );
  const topics = [...new Set(filtered.map((f) => f.topic))];

  return (
    <PageShell>
      <TopBar title="FAQ" subtitle="Common questions" backTo="/" />

      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions"
            aria-label="Search questions"
            className="rounded-xl pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No matching questions"
          description="Try a different word, or contact support for help."
        />
      ) : (
        <div className="space-y-5 px-4 pb-8">
          {topics.map((topic) => (
            <section key={topic}>
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {topic}
              </h2>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4 card-elevated">
                {filtered
                  .filter((f) => f.topic === topic)
                  .map((f) => (
                    <AccordionItem key={f.question} value={f.question}>
                      <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {f.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
