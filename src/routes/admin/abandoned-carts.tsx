import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Mail, MessageSquare, Clock, IndianRupee, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/abandoned-carts")({
  head: () => ({
    meta: [
      { title: "Abandoned Carts — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Recover lost sales from abandoned shopping carts." },
    ],
  }),
  component: AbandonedCartsPage,
});

const CARTS = [
  {
    id: "1",
    customer: "Priya S.",
    email: "priya.s@email.com",
    items: 4,
    value: 1840,
    abandoned: "12 min ago",
    stage: "checkout",
    reminderSent: false,
  },
  {
    id: "2",
    customer: "Ramesh K.",
    email: "+91 98765 43210",
    items: 2,
    value: 620,
    abandoned: "45 min ago",
    stage: "cart",
    reminderSent: true,
  },
  {
    id: "3",
    customer: "Lakshmi M.",
    email: "lakshmi.m@email.com",
    items: 7,
    value: 3200,
    abandoned: "2 hours ago",
    stage: "checkout",
    reminderSent: false,
  },
  {
    id: "4",
    customer: "Arun V.",
    email: "+91 87654 32109",
    items: 1,
    value: 450,
    abandoned: "3 hours ago",
    stage: "cart",
    reminderSent: true,
  },
  {
    id: "5",
    customer: "Meena R.",
    email: "meena.r@email.com",
    items: 3,
    value: 980,
    abandoned: "5 hours ago",
    stage: "payment",
    reminderSent: false,
  },
  {
    id: "6",
    customer: "Guest",
    email: "—",
    items: 2,
    value: 340,
    abandoned: "Yesterday",
    stage: "cart",
    reminderSent: false,
  },
];

function AbandonedCartsPage() {
  const totalValue = CARTS.reduce((s, c) => s + c.value, 0);
  const recoverable = CARTS.filter((c) => !c.reminderSent).length;

  function sendReminder(id: string, name: string) {
    toast.success(`Recovery reminder sent to ${name}`);
  }

  function sendAll() {
    const pending = CARTS.filter((c) => !c.reminderSent);
    toast.success(`Sent ${pending.length} recovery reminders`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Abandoned carts</h1>
          <p className="text-sm text-muted-foreground">Recover lost sales with timely reminders</p>
        </div>
        <Button size="sm" className="rounded-xl text-xs" onClick={sendAll}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Send all reminders ({recoverable})
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Abandoned carts", value: String(CARTS.length), icon: ShoppingCart },
          { label: "Total value", value: formatINR(totalValue), icon: IndianRupee },
          { label: "Recoverable", value: String(recoverable), icon: Eye },
          { label: "Recovery rate", value: "24%", icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium text-right">Items</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Abandoned</th>
                <th className="px-4 py-3 font-medium">Reminder</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {CARTS.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{c.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.items}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatINR(c.value)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        c.stage === "payment"
                          ? "bg-destructive/10 text-destructive"
                          : c.stage === "checkout"
                            ? "bg-accent-soft text-accent-foreground"
                            : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {c.abandoned}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.reminderSent ? (
                      <span className="text-[10px] font-semibold text-primary">Sent</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!c.reminderSent && (
                      <button
                        type="button"
                        onClick={() => sendReminder(c.id, c.customer)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        <Mail className="h-3 w-3" />
                        Remind
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-4">
        <p className="text-sm font-semibold text-foreground">Recovery tips</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>• Send first reminder within 1 hour for best recovery rates</li>
          <li>• Carts abandoned at payment stage have 3× higher recovery potential</li>
          <li>• Include a small discount (₹50 off) in the second reminder</li>
        </ul>
      </div>
    </div>
  );
}
