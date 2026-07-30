import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SuccessState } from "@/components/state-blocks";
import { useStorefront } from "@/hooks/use-storefront";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Call, email or message Sri Mahalakshmi Stores for orders, deliveries and support in Chennai.",
      },
      { property: "og:title", content: "Contact Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Reach our Chennai support team by phone, email or message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { settings } = useStorefront();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("Please enter a valid email");
    if (message.trim().length < 10) return toast.error("Please add a little more detail");
    setSent(true);
  }

  return (
    <PageShell>
      <TopBar title="Contact us" subtitle="We reply within a few hours" backTo="/" />

      <section className="space-y-2.5 p-4">
        {[
          { icon: Phone, label: settings.support_phone, sub: "Daily, 7 AM – 10 PM", href: `tel:${settings.support_phone}` },
          { icon: Mail, label: settings.support_email, sub: "Email support", href: `mailto:${settings.support_email}` },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <item.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          </a>
        ))}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">7:00 AM – 10:00 PM</p>
            <p className="text-xs text-muted-foreground">All outlets, all days</p>
          </div>
        </div>
        <Link
          to="/stores"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Visit a store</p>
            <p className="text-xs text-muted-foreground">Four outlets across Chennai</p>
          </div>
        </Link>
      </section>

      {sent ? (
        <SuccessState
          title="Message sent"
          description="Our team will get back to you on the email you shared."
          action={
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setSent(false)}>
              Send another message
            </Button>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-6">
          <h2 className="text-base font-bold">Send a message</h2>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Your name</Label>
            <Input id="c-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-message">Message</Label>
            <Textarea
              id="c-message"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-28 rounded-xl"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl">
            <Send className="mr-2 h-4 w-4" /> Send message
          </Button>
        </form>
      )}
    </PageShell>
  );
}
