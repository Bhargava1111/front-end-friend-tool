import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Copy, Check, Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AMOUNTS = [500, 1000, 2000, 5000];

const DESIGNS = [
  { id: "festive", label: "Festive", emoji: "🪔", tone: "from-accent to-accent/70" },
  { id: "fresh", label: "Fresh", emoji: "🌿", tone: "from-primary to-primary/70" },
  { id: "celebrate", label: "Celebrate", emoji: "🎉", tone: "from-destructive/80 to-accent" },
];

export const Route = createFileRoute("/gift-cards")({
  head: () => ({
    meta: [
      { title: "Gift Cards — Perfect for Any Occasion | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Send digital gift cards for groceries and pooja essentials. Choose amount and design.",
      },
      { property: "og:title", content: "Gift Cards — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "The perfect gift for family and friends." },
    ],
  }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const [amount, setAmount] = useState(1000);
  const [design, setDesign] = useState("festive");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const selectedDesign = DESIGNS.find((d) => d.id === design) ?? DESIGNS[0];

  function handlePurchase() {
    if (!recipient.trim()) {
      toast.error("Please enter recipient email or phone");
      return;
    }
    toast.success(`Gift card of ₹${amount.toLocaleString("en-IN")} ready to send!`, {
      description: "Gift cards will be delivered via SMS/email shortly.",
    });
  }

  return (
    <PageShell>
      <TopBar title="Gift cards" subtitle="Share the joy of fresh groceries" backTo="/" />

      <section className="mx-4 mt-4 lg:mx-0">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-primary-foreground",
            selectedDesign.tone,
          )}
        >
          <div className="relative">
            <span className="text-4xl">{selectedDesign.emoji}</span>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-primary-foreground/70">
              Sri Mahalakshmi Stores
            </p>
            <p className="mt-1 text-3xl font-bold">₹{amount.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-sm text-primary-foreground/80">Digital gift card</p>
            {message && (
              <p className="mt-4 rounded-xl bg-background/15 px-3 py-2 text-xs italic backdrop-blur">
                "{message}"
              </p>
            )}
          </div>
        </div>
      </section>

      <Reveal className="mt-6 space-y-5 px-4 lg:px-0">
        <div>
          <Label className="text-sm font-semibold">Choose amount</Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                  amount === a
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                )}
              >
                ₹{a}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Input
              type="number"
              min={100}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Custom amount"
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold">Card design</Label>
          <div className="mt-2 flex gap-2">
            {DESIGNS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDesign(d.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 transition-colors",
                  design === d.id
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className="text-xl">{d.emoji}</span>
                <span className="text-[10px] font-semibold">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="recipient">Recipient email or phone</Label>
          <Input
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="friend@email.com or +91 98765 43210"
            className="mt-1.5 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="message">Personal message (optional)</Label>
          <Input
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Wishing you a blessed festival!"
            className="mt-1.5 rounded-xl"
          />
        </div>

        <Button className="h-12 w-full rounded-xl text-sm font-semibold" onClick={handlePurchase}>
          <Gift className="mr-2 h-4 w-4" />
          Send gift card — ₹{amount.toLocaleString("en-IN")}
        </Button>
      </Reveal>

      <Reveal className="mt-6 px-4 lg:px-0">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "Instant delivery", copy: "Sent via SMS & email within minutes" },
            { icon: Check, title: "No expiry", copy: "Use anytime — no rush to redeem" },
            { icon: Heart, title: "Any product", copy: "Valid on all groceries & pooja items" },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mx-4 mt-6 mb-6 rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center lg:mx-0">
        <p className="text-sm font-semibold text-foreground">Have a gift card code?</p>
        <p className="mt-1 text-xs text-muted-foreground">Apply it at checkout in the coupon field</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          onClick={() => {
            navigator.clipboard?.writeText("GIFT500");
            toast.success("Sample code copied: GIFT500");
          }}
        >
          <Copy className="h-3 w-3" /> Copy sample code
        </button>
      </Reveal>
    </PageShell>
  );
}
