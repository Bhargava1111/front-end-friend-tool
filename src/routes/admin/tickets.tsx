import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminTicketsClient, updateAdminTicketClient } from "@/lib/admin-client.functions";

import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { getAdminTickets, updateAdminTicket } from "@/lib/admin-platform.functions";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/tickets")({
  component: AdminTickets,
});

type AdminTicket = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_notes?: string;
  order_number?: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

function AdminTickets() {
  const qc = useQueryClient();
  const fetch = useAdminFn(getAdminTickets, getAdminTicketsClient);
  const update = useAdminFn(updateAdminTicket, updateAdminTicketClient);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const rows = await fetch();
      return (Array.isArray(rows) ? rows : []) as AdminTicket[];
    },
    refetchInterval: 20_000,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: string; admin_notes?: string }) =>
      update({ data: vars }),
    onSuccess: () => {
      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function sendReply(ticket: AdminTicket) {
    const reply = (replies[ticket.id] ?? ticket.admin_notes ?? "").trim();
    if (reply.length < 3) return toast.error("Write a reply before sending");
    mutation.mutate({
      id: ticket.id,
      status: ticket.status === "open" ? "in_progress" : ticket.status,
      admin_notes: reply,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold">Support tickets</h1>
        <p className="text-xs text-muted-foreground">{data.length} total</p>
      </div>
      {isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Could not load tickets. Make sure you have admin ticket access.
        </p>
      )}
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}
      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No support tickets yet. Customer tickets from the contact form and raise-ticket page appear here.
        </p>
      )}
      {data.map((t) => (
        <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{t.subject}</p>
              <p className="text-xs text-muted-foreground">
                {t.name} · {t.category} · {t.order_number ? `Order ${t.order_number}` : "No order"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(t.created_at)}</p>
              {(t.email || t.phone) && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {t.email && (
                    <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 underline">
                      <Mail className="h-3 w-3" /> {t.email}
                    </a>
                  )}
                  {t.phone && <span>{t.phone}</span>}
                </p>
              )}
            </div>
            <Select
              value={t.status}
              onValueChange={(status) => mutation.mutate({ id: t.id, status })}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm text-foreground whitespace-pre-wrap">
            {t.message}
          </p>
          {t.admin_notes && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Last reply sent</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{t.admin_notes}</p>
            </div>
          )}
          <Textarea
            className="mt-3 min-h-[80px] text-sm"
            placeholder="Write a reply to the customer…"
            value={replies[t.id] ?? ""}
            onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" disabled={mutation.isPending} onClick={() => sendReply(t)}>
              <Send className="h-3.5 w-3.5" />
              {mutation.isPending ? "Sending…" : "Send reply"}
            </Button>
            <span className="self-center text-[11px] text-muted-foreground">
              Status: {statusLabel(t.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
