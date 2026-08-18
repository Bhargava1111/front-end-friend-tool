import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send, Ticket } from "lucide-react";
import { toast } from "sonner";
import { getMySupportTickets, submitSupportTicket } from "@/lib/platform.functions";
import { useSession } from "@/hooks/use-shop";
import { PageShell, TopBar } from "@/components/page-shell";
import { SuccessState } from "@/components/state-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "order", label: "Order issue" },
  { value: "delivery", label: "Delivery" },
  { value: "payment", label: "Payment" },
  { value: "product", label: "Product quality" },
  { value: "other", label: "Other" },
] as const;

type SupportSearch = { orderId?: string };

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): SupportSearch => ({
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Raise a Ticket — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Raise a support ticket for orders, delivery, payments or product issues.",
      },
      { property: "og:title", content: "Raise a Ticket — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Get help from our support team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

type TicketRow = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  order_number?: string | null;
  admin_response?: string | null;
  created_at: string;
  updated_at?: string;
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: string) {
  if (status === "resolved" || status === "closed") return "bg-primary/15 text-primary";
  if (status === "in_progress") return "bg-accent/20 text-accent-foreground";
  return "bg-secondary text-muted-foreground";
}

function SupportPage() {
  const { orderId } = Route.useSearch();
  const { user, session } = useSession();
  const qc = useQueryClient();
  const send = useServerFn(submitSupportTicket);
  const fetchTickets = useServerFn(getMySupportTickets);

  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(orderId ? "Help with my order" : "");
  const [category, setCategory] = useState(orderId ? "order" : "other");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.full_name) setName(user.full_name);
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchTickets() as Promise<TicketRow[]>,
    enabled: !!session,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject: subject.trim() || "Support request",
          message: message.trim(),
          category,
          order_id: orderId,
        },
      }),
    onSuccess: () => {
      setSent(true);
      setSubject(orderId ? "Help with my order" : "");
      setMessage("");
      if (session) qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Please enter your name");
    if (!session && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return toast.error("Please enter a valid email");
    }
    if (message.trim().length < 10) return toast.error("Please add more detail about your issue");
    sendMutation.mutate();
  }

  return (
    <PageShell>
      <TopBar title="Raise a ticket" subtitle="We usually respond within a few hours" backTo="/help" />

      <section className="px-4 pt-2">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
          <Ticket className="h-7 w-7" />
          <h2 className="mt-3 text-base font-bold">Tell us what went wrong</h2>
          <p className="mt-1 text-xs text-primary-foreground/80">
            Your ticket is tracked so our team can follow up. You can also{" "}
            <Link to="/contact" className="underline">
              use the contact form
            </Link>{" "}
            or call us directly.
          </p>
        </div>
      </section>

      {sent ? (
        <SuccessState
          title="Ticket raised"
          description="Our support team has your request and will get back to you soon."
          action={
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={() => {
                setSent(false);
                setMessage("");
              }}
            >
              Raise another ticket
            </Button>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Your name</Label>
            <Input id="s-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email</Label>
            <Input
              id="s-email"
              type="email"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
              required={!session}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Phone (optional)</Label>
            <Input id="s-phone" type="tel" value={phone} maxLength={15} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="s-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-subject">Subject</Label>
            <Input
              id="s-subject"
              value={subject}
              maxLength={255}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
            />
          </div>
          {orderId && (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Linked to order · reference ID {orderId.slice(0, 8)}…
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="s-message">Describe the issue</Label>
            <Textarea
              id="s-message"
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-32 rounded-xl"
              placeholder="Include order number, what happened, and what you need from us"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={sendMutation.isPending}>
            <Send className="mr-2 h-4 w-4" /> {sendMutation.isPending ? "Submitting…" : "Submit ticket"}
          </Button>
        </form>
      )}

      {session && (
        <section className="space-y-3 px-4 pb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <LifeBuoy className="h-4 w-4 text-primary" /> My tickets
          </h2>
          {ticketsLoading && <div className="h-24 animate-pulse rounded-2xl bg-card" />}
          {!ticketsLoading && tickets.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No tickets yet. Submit a request above and it will show up here.
            </p>
          )}
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category}
                    {t.order_number ? ` · Order ${t.order_number}` : ""} · {formatDate(t.created_at)}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", statusTone(t.status))}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{t.message}</p>
              {t.admin_response && (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Support reply</p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{t.admin_response}</p>
                  {t.updated_at && (
                    <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(t.updated_at)}</p>
                  )}
                </div>
              )}
              {!t.admin_response && t.status !== "open" && (
                <p className="mt-2 text-xs text-muted-foreground">Our team is working on your request.</p>
              )}
            </div>
          ))}
        </section>
      )}

      {!session && (
        <p className="px-4 pb-8 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary underline">
            Sign in
          </Link>{" "}
          to view your ticket history.
        </p>
      )}
    </PageShell>
  );
}
