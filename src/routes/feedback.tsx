import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { StarRating } from "@/components/star-rating";
import { SuccessState } from "@/components/state-blocks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Share Feedback — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Tell us what worked and what didn't so we can improve delivery, products and the app.",
      },
      { property: "og:title", content: "Share Feedback" },
      { property: "og:description", content: "Rate your experience and tell us how we can improve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

const AREAS = ["Delivery speed", "Product quality", "Pricing", "App experience", "Support"];

function FeedbackPage() {
  const [rating, setRating] = useState(5);
  const [areas, setAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <PageShell>
        <TopBar title="Feedback" backTo="/" />
        <SuccessState
          title="Thank you"
          description="Your feedback goes straight to the store team. We read every note."
          action={
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setSent(false)}>
              Send more feedback
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar title="Share feedback" subtitle="Takes under a minute" backTo="/" />
      <form
        className="space-y-5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (notes.trim().length < 5 && areas.length === 0) {
            toast.error("Pick an area or add a short note");
            return;
          }
          setSent(true);
        }}
      >
        <div>
          <Label className="text-sm font-semibold">How was your experience?</Label>
          <StarRating value={rating} onChange={setRating} size={18} className="mt-2 -ml-2" />
        </div>

        <div>
          <Label className="text-sm font-semibold">What is this about?</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const active = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setAreas((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-notes" className="text-sm font-semibold">
            Anything else?
          </Label>
          <Textarea
            id="fb-notes"
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell us what we should fix or keep doing."
            className="min-h-28 rounded-xl"
          />
        </div>

        <Button type="submit" className="h-12 w-full rounded-xl">
          Submit feedback
        </Button>
      </form>
    </PageShell>
  );
}
