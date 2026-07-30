import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { id: number; from: "bot" | "you"; text: string };

const QUICK_REPLIES = [
  "Where is my order?",
  "Delivery areas",
  "Return an item",
  "Payment options",
];

function reply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("order") || t.includes("track"))
    return "You can follow your order live under Profile → My Orders. Pending orders can still be cancelled from there.";
  if (t.includes("deliver"))
    return "We deliver within 5 km of each Chennai outlet. Express orders arrive in about 90 minutes, or pick a slot at checkout.";
  if (t.includes("return") || t.includes("refund"))
    return "Open the order, tap Request return and pick a reason. Perishables need to be reported the same day.";
  if (t.includes("pay") || t.includes("upi") || t.includes("card"))
    return "Cash on delivery is live now. UPI, cards and net banking appear at checkout and go live shortly.";
  if (t.includes("coupon") || t.includes("offer"))
    return "Try FIRST100 for ₹100 off above ₹399, POOJA15 for 15% off, or FREESHIP for free delivery above ₹249.";
  return "Thanks for writing in — a support agent will pick this up shortly. You can also call us on +91 98400 12345.";
}

export function ChatSupport() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "bot", text: "Hi! I'm the Sri Mahalakshmi assistant. How can I help today?" },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((m) => [
      ...m,
      { id: Date.now(), from: "you", text: value },
      { id: Date.now() + 1, from: "bot", text: reply(value) },
    ]);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat support"
        className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chat support"
          className="fixed inset-0 z-[70] flex items-end bg-foreground/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-[78dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Chat support</p>
                <p className="text-[11px] text-primary">Typically replies in a few minutes</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.from === "you"
                      ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
                      : "mr-auto max-w-[80%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5 text-sm text-foreground"
                  }
                >
                  {m.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message"
                aria-label="Message"
                className="rounded-xl"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
