import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { adminListCoupons, adminDeleteCoupon } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/coupons/")({
  component: AdminCouponsPage,
});

type CouponRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  banner_url: string | null;
};

function describe(c: CouponRow) {
  if (c.discount_type === "percent")
    return `${c.discount_value}% off${c.max_discount ? ` up to ${formatINR(c.max_discount)}` : ""}`;
  if (c.discount_type === "flat") return `${formatINR(c.discount_value)} off`;
  return "Free delivery";
}

function AdminCouponsPage() {
  const list = useServerFn(adminListCoupons);
  const remove = useServerFn(adminDeleteCoupon);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => list() as Promise<CouponRow[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Coupons</h1>
          <p className="text-xs text-muted-foreground">Promo codes customers can apply in the cart</p>
        </div>
        <Button size="sm" className="rounded-xl" asChild>
          <Link to="/admin/coupons/new">
            <Plus className="mr-1.5 h-4 w-4" /> New coupon
          </Link>
        </Button>
      </div>

      {isError ? (
        <ErrorState description="Could not load coupons." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-foreground">
                  <TicketPercent className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold tracking-wide">{c.code}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.title}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Edit ${c.code}`} asChild>
                  <Link to="/admin/coupons/$id" params={{ id: c.id }}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${c.code}`}
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5">{describe(c)}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">Min {formatINR(c.min_order)}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">Used {c.used_count}×</span>
                {!c.is_active && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
