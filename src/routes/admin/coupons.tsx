import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { adminListCoupons, adminSaveCoupon, adminDeleteCoupon } from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/admin/coupons")({
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
};

const blank = {
  code: "",
  title: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_order: 299,
  max_discount: "",
  usage_limit: "",
  is_active: true,
};

function describe(c: CouponRow) {
  if (c.discount_type === "percent")
    return `${c.discount_value}% off${c.max_discount ? ` up to ${formatINR(c.max_discount)}` : ""}`;
  if (c.discount_type === "flat") return `${formatINR(c.discount_value)} off`;
  return "Free delivery";
}

function AdminCouponsPage() {
  const list = useServerFn(adminListCoupons);
  const save = useServerFn(adminSaveCoupon);
  const remove = useServerFn(adminDeleteCoupon);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => list() as Promise<CouponRow[]>,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: editing ?? undefined,
          code: form.code,
          title: form.title.trim(),
          description: form.description,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value) || 0,
          min_order: Number(form.min_order) || 0,
          max_discount: form.max_discount === "" ? null : Number(form.max_discount),
          usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-meta"] });
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setEditing(null);
                setForm({ ...blank });
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-code">Code</Label>
                <Input
                  id="c-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="FESTIVE20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-title">Title</Label>
                <Input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-desc">Description</Label>
                <Input
                  id="c-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-type">Discount type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v })}
                >
                  <SelectTrigger id="c-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage off</SelectItem>
                    <SelectItem value="flat">Flat amount off</SelectItem>
                    <SelectItem value="free_shipping">Free delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-value">Value</Label>
                  <Input
                    id="c-value"
                    type="number"
                    value={form.discount_value}
                    disabled={form.discount_type === "free_shipping"}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-min">Min order ₹</Label>
                  <Input
                    id="c-min"
                    type="number"
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-max">Max discount ₹</Label>
                  <Input
                    id="c-max"
                    type="number"
                    value={form.max_discount}
                    placeholder="none"
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-limit">Usage limit</Label>
                  <Input
                    id="c-limit"
                    type="number"
                    value={form.usage_limit}
                    placeholder="unlimited"
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="c-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="c-active">Active</Label>
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={!form.code.trim() || !form.title.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${c.code}`}
                  onClick={() => {
                    setEditing(c.id);
                    setForm({
                      code: c.code,
                      title: c.title,
                      description: c.description ?? "",
                      discount_type: c.discount_type,
                      discount_value: Number(c.discount_value),
                      min_order: Number(c.min_order),
                      max_discount: c.max_discount === null ? "" : String(c.max_discount),
                      usage_limit: c.usage_limit === null ? "" : String(c.usage_limit),
                      is_active: c.is_active,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
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
