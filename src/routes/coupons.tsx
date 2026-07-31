import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { useStorefront } from "@/hooks/use-storefront";
import { couponLabel } from "@/lib/commerce";
import { COUPONS } from "@/lib/mock-content";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons & Discount Codes — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "All active coupon codes with minimum order value, validity and savings, ready to copy.",
      },
      { property: "og:title", content: "Coupons & Discount Codes" },
      { property: "og:description", content: "Copy a code and save on your next grocery or pooja order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const { coupons, isLoading } = useStorefront();
  const [copied, setCopied] = useState<string | null>(null);

  const list = coupons.length
    ? coupons.map((c) => ({
        code: c.code,
        title: c.title,
        description: c.description ?? "Apply this code at checkout",
        discount: couponLabel(c),
        minOrder: Number(c.min_order),
        maxDiscount: c.max_discount ? Number(c.max_discount) : null,
        endsAt: c.ends_at ?? null,
      }))
    : COUPONS.map((c) => ({ ...c, maxDiscount: null, endsAt: null }));

  return (
    <PageShell>
      <TopBar title="Coupons for you" subtitle="Tap a code to copy" backTo="/" />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-6 w-6" />}
          title="No coupons right now"
          description="New offers are added every week — check back soon."
        />
      ) : (
        <div className="space-y-3 p-4">
          {list.map((c, i) => (
            <Reveal key={c.code} delay={i * 0.04}>
              <div className="flex items-stretch overflow-hidden rounded-3xl border border-dashed border-accent/60 bg-accent-soft/60">
                <div className="grid w-[86px] shrink-0 place-items-center bg-accent/20 px-2 text-center">
                  <span className="text-[11px] font-extrabold uppercase leading-tight text-accent-foreground">
                    {c.discount}
                  </span>
                </div>
                <div className="min-w-0 flex-1 p-4">
                  <p className="text-sm font-bold text-foreground">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Min order {formatINR(c.minOrder)}
                    {c.maxDiscount ? ` · Max saving ${formatINR(c.maxDiscount)}` : ""}
                    {c.endsAt ? ` · Valid till ${formatDate(c.endsAt)}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(c.code);
                      setCopied(c.code);
                      toast.success(`Coupon ${c.code} copied`);
                      setTimeout(() => setCopied(null), 1600);
                    }}
                    className="mt-3 flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-primary"
                  >
                    {copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {c.code}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </PageShell>
  );
}
