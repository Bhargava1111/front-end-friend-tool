import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouterState, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import {
  setOrderDeliveryClient,
  getAdminOrdersClient,
  setOrderStatusClient,
  getAdminCustomerDetailClient,
  bulkUpdateOrdersClient,
} from "@/lib/admin-client.functions";

import { toast } from "sonner";
import { CalendarClock, Check, CheckCheck, Eye, Plus, X, ArrowUpDown } from "lucide-react";
import { setOrderDelivery } from "@/lib/admin-ops.functions";
import { getAdminOrders, getAdminCustomerDetail, setOrderStatus, bulkUpdateOrders } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES, STATUS_LABEL, OPEN_ORDER_STATUSES } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.customer ?? search.user_id;
    const customer = Array.isArray(raw)
      ? String(raw[0] ?? "")
      : raw != null && raw !== ""
        ? String(raw)
        : undefined;
    return {
      customer: customer || undefined,
      open: search.open === "1" || search.open === 1 || search.open === true,
    };
  },
  head: () => ({
    meta: [{ title: "Order Management — Admin | Sri Mahalakshmi Stores" }],
  }),
  component: AdminOrders,
});

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

type DayFilter = "all" | "today" | "yesterday" | "week" | "custom";
type SortOrder = "newest" | "oldest";

const QUICK_BULK_ACTIONS: { status: OrderStatus; label: string; tone?: "destructive" }[] = [
  { status: "confirmed", label: "Approve" },
  { status: "packed", label: "Packed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
  { status: "cancelled", label: "Cancel", tone: "destructive" },
];

function DayGroupToolbar({
  dayKey,
  label,
  items,
  selected,
  deliveryDate,
  onDeliveryDateChange,
  onToggleGroup,
  onApplyStatus,
  busy,
}: {
  dayKey: string;
  label: string;
  items: Order[];
  selected: Set<string>;
  deliveryDate: string;
  onDeliveryDateChange: (dayKey: string, value: string) => void;
  onToggleGroup: (items: Order[]) => void;
  onApplyStatus: (orderIds: string[], status: OrderStatus, deliveryDate?: string) => void;
  busy: boolean;
}) {
  const allInGroupSelected = items.length > 0 && items.every((o) => selected.has(o.id));
  const selectedInGroup = items.filter((o) => selected.has(o.id));
  const targetCount = selectedInGroup.length > 0 ? selectedInGroup.length : items.length;
  const targetIds =
    selectedInGroup.length > 0 ? selectedInGroup.map((o) => o.id) : items.map((o) => o.id);

  return (
    <div className="sticky top-0 z-10 space-y-2 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={allInGroupSelected}
          onCheckedChange={() => onToggleGroup(items)}
          aria-label={`Select all orders for ${label}`}
        />
        <h2 className="text-xs font-bold text-foreground">
          {label}
          <span className="ml-2 font-normal text-muted-foreground">
            ({items.length} order{items.length !== 1 ? "s" : ""}
            {selectedInGroup.length > 0 ? ` · ${selectedInGroup.length} selected` : ""})
          </span>
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-7 rounded-lg px-2 text-[10px]"
          disabled={busy}
          onClick={() => onToggleGroup(items)}
        >
          {allInGroupSelected ? "Deselect day" : "Select day"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">Day actions ({targetCount}):</span>
        <Input
          type="date"
          className="h-7 w-32 text-[10px]"
          value={deliveryDate}
          onChange={(e) => onDeliveryDateChange(dayKey, e.target.value)}
          title="Delivery date for approve on this day"
        />
        {QUICK_BULK_ACTIONS.map((action) => (
          <Button
            key={action.status}
            type="button"
            size="sm"
            variant={action.tone === "destructive" ? "outline" : "secondary"}
            className={cn(
              "h-7 rounded-lg px-2.5 text-[10px]",
              action.tone === "destructive" && "border-destructive/40 text-destructive",
            )}
            disabled={busy || targetIds.length === 0}
            onClick={() =>
              onApplyStatus(
                targetIds,
                action.status,
                action.status === "confirmed" ? deliveryDate : undefined,
              )
            }
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orderDay = new Date(d);
  orderDay.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - orderDay.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function AdminOrders() {
  const qc = useQueryClient();
  const typedSearch = Route.useSearch();
  const looseSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const href = useRouterState({ select: (s) => s.location.href });
  const hrefCustomer = (() => {
    try {
      const fromHref = new URL(href, "http://localhost").searchParams.get("customer");
      if (fromHref) return fromHref;
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("customer") ?? undefined;
    }
    return undefined;
  })();
  const customer =
    typedSearch.customer ||
    (typeof looseSearch.customer === "string" ? looseSearch.customer : undefined) ||
    hrefCustomer ||
    undefined;
  const open = Boolean(typedSearch.open);

  const fetchOrders = useAdminFn(getAdminOrders, getAdminOrdersClient);
  const fetchCustomer = useAdminFn(getAdminCustomerDetail, getAdminCustomerDetailClient);
  const updateStatus = useAdminFn(setOrderStatus, setOrderStatusClient);
  const bulkUpdate = useAdminFn(bulkUpdateOrders, bulkUpdateOrdersClient);

  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [customDate, setCustomDate] = useState("");
  const [groupByDay, setGroupByDay] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dates, setDates] = useState<Record<string, string>>({});
  const [bulkDeliveryDate, setBulkDeliveryDate] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("confirmed");
  const [groupDates, setGroupDates] = useState<Record<string, string>>({});

  const scheduleFn = useAdminFn(setOrderDelivery, setOrderDeliveryClient);

  const queryDay =
    dayFilter === "today" || dayFilter === "yesterday" || dayFilter === "week"
      ? dayFilter
      : undefined;
  const queryDate = dayFilter === "custom" && customDate ? customDate : undefined;

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-orders", customer, open, sort, queryDay, queryDate],
    queryFn: () =>
      fetchOrders({
        data: { customer, open, sort, day: queryDay, date: queryDate },
      }) as Promise<Order[]>,
    staleTime: 0,
  });

  const refreshOrders = async () => {
    await qc.refetchQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const patchOrdersInCache = (
    orderIds: string[],
    patch: Partial<Order> & { status?: OrderStatus },
  ) => {
    const idSet = new Set(orderIds.map(String));
    qc.setQueriesData<Order[]>({ queryKey: ["admin-orders"] }, (old) =>
      old?.map((o) => (idSet.has(String(o.id)) ? { ...o, ...patch } : o)),
    );
  };

  const patchOrdersFromResults = (results: Array<{ id: string; status: string }>) => {
    for (const row of results) {
      patchOrdersInCache([row.id], { status: row.status as OrderStatus });
    }
  };

  const { data: customerDetail } = useQuery({
    queryKey: ["admin-customer", customer],
    queryFn: () => fetchCustomer({ data: { id: customer! } }),
    enabled: Boolean(customer),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => updateStatus({ data: vars }),
    onMutate: (vars) => {
      patchOrdersInCache([vars.id], { status: vars.status });
    },
    onSuccess: async (res, vars) => {
      const nextStatus = (res?.status as OrderStatus | undefined) ?? vars.status;
      patchOrdersInCache([vars.id], { status: nextStatus });
      await refreshOrders();
      toast.success(`Order marked ${STATUS_LABEL[nextStatus]}`);
    },
    onError: (e: Error, vars) => {
      void refreshOrders();
      toast.error(e.message || `Could not update order to ${STATUS_LABEL[vars.status]}`);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (vars: { order_ids?: string[]; action?: string; status?: OrderStatus; delivery_date?: string }) =>
      bulkUpdate({ data: vars }),
    onMutate: (vars) => {
      const ids = (vars.order_ids ?? []).map(String);
      if (ids.length && vars.status) {
        patchOrdersInCache(ids, {
          status: vars.status,
          ...(vars.status === "confirmed" && vars.delivery_date
            ? { delivery_date: vars.delivery_date }
            : {}),
        });
      }
    },
    onSuccess: async (res, vars) => {
      const ids = (vars.order_ids ?? []).map(String);
      const nextStatus = (res.status ?? vars.status) as OrderStatus | undefined;
      if (res.orders?.length) {
        patchOrdersFromResults(res.orders);
      } else if (ids.length && nextStatus) {
        patchOrdersInCache(ids, {
          status: nextStatus,
          ...(nextStatus === "confirmed" && vars.delivery_date
            ? { delivery_date: vars.delivery_date }
            : {}),
        });
      }
      setSelected(new Set());
      await refreshOrders();
      const changed = res.changed ?? res.updated ?? 0;
      if (changed > 0 && nextStatus) {
        toast.success(
          `Updated ${changed} order${changed !== 1 ? "s" : ""} → ${STATUS_LABEL[nextStatus] ?? nextStatus}`,
        );
      } else if ((res.updated ?? 0) === 0) {
        toast.error("No orders matched — refresh the page and try again");
      } else {
        toast.message("Orders were already in that status");
      }
    },
    onError: (e: Error) => {
      void refreshOrders();
      toast.error(e.message || "Bulk status update failed");
    },
  });

  const schedule = useMutation({
    mutationFn: (vars: { id: string; delivery_date: string; status?: string }) =>
      scheduleFn({ data: vars }),
    onSuccess: async (_res, vars) => {
      patchOrdersInCache([vars.id], {
        delivery_date: vars.delivery_date,
        status: (vars.status as OrderStatus) ?? "confirmed",
      });
      await refreshOrders();
      toast.success("Delivery date saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  let orders = filter === "all" ? data : data.filter((o) => o.status === filter);
  if (customer) {
    const allowedIds = new Set(
      ((customerDetail?.orders ?? []) as Array<{ id: string }>).map((o) => String(o.id)),
    );
    const phoneDigits = String(customerDetail?.profile?.phone ?? "").replace(/\D/g, "");
    orders = orders.filter((o) => {
      if (String(o.user_id ?? "") === String(customer)) return true;
      if (allowedIds.has(String(o.id))) return true;
      const orderPhone = String(o.phone ?? "").replace(/\D/g, "");
      if (phoneDigits && orderPhone && phoneDigits === orderPhone) return true;
      return false;
    });
    if (orders.length === 0 && allowedIds.size > 0) {
      orders = (customerDetail?.orders ?? []) as typeof orders;
    }
  }
  if (open) orders = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status));

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const pendingCount = pendingOrders.length;
  const allPendingSelected =
    pendingOrders.length > 0 && pendingOrders.every((o) => selected.has(o.id));
  const allVisibleSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));

  function applyBulkStatus(orderIds: string[], status: OrderStatus = bulkStatus, deliveryDate?: string) {
    if (!orderIds.length) return;
    const date = deliveryDate ?? bulkDeliveryDate;
    if (status === "confirmed" && !date) {
      toast.error("Pick a delivery date for confirmed orders");
      return;
    }
    if (status === "cancelled" && !confirm(`Cancel ${orderIds.length} order(s)?`)) return;
    bulkMutation.mutate({
      order_ids: orderIds,
      action: status,
      status,
      delivery_date: status === "confirmed" ? date : undefined,
    });
  }

  const grouped = useMemo(() => {
    if (!groupByDay) return [{ dayKey: "all", label: "", items: orders }];
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.created_at?.slice(0, 10) ?? "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).map(([dayKey, items]) => ({
      dayKey,
      label: items[0]?.created_at ? dayLabel(items[0].created_at) : dayKey,
      items,
    }));
  }, [orders, groupByDay]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPending() {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingOrders.map((o) => o.id)));
    }
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  function toggleSelectGroup(groupItems: Order[]) {
    const allSelected = groupItems.every((o) => selected.has(o.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const o of groupItems) {
        if (allSelected) next.delete(o.id);
        else next.add(o.id);
      }
      return next;
    });
  }

  function groupDeliveryDate(dayKey: string) {
    return groupDates[dayKey] ?? bulkDeliveryDate;
  }

  return (
    <div className="space-y-4">
      {(customer || open) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary-soft/40 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">
              {customer ? "This customer's orders only" : "Filtered view"}
              {open && " · Open orders"}
            </p>
            <p className="text-xs text-muted-foreground">{orders.length} order(s) shown</p>
          </div>
          <Link
            to="/admin/orders/"
            search={{ customer: undefined, open: false }}
            className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground"
          >
            Show all orders
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-foreground">Orders</h1>
          <p className="text-xs text-muted-foreground">
            {pendingCount
              ? `${pendingCount} order${pendingCount === 1 ? "" : "s"} awaiting approval`
              : "All orders reviewed"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
              disabled={bulkMutation.isPending}
              onClick={() =>
                bulkMutation.mutate({
                  action: "approve",
                  delivery_date: bulkDeliveryDate,
                  status: "confirmed",
                })
              }
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Approve all pending ({pendingCount})
            </Button>
          )}
          {selected.size > 0 && (
            <>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as OrderStatus)}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bulkStatus === "confirmed" && (
                <Input
                  type="date"
                  className="h-8 w-36 text-xs"
                  value={bulkDeliveryDate}
                  onChange={(e) => setBulkDeliveryDate(e.target.value)}
                  title="Delivery date for bulk confirm"
                />
              )}
              <Button
                size="sm"
                className="gap-1.5 rounded-xl text-xs"
                disabled={bulkMutation.isPending}
                onClick={() => applyBulkStatus(Array.from(selected), bulkStatus)}
              >
                <Check className="h-3.5 w-3.5" />
                Apply to {selected.size} selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-xs"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </>
          )}
          <Button className="gap-2 rounded-xl" size="sm" asChild>
            <Link to="/admin/orders/new">
              <Plus className="h-4 w-4" /> New order
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dayFilter} onValueChange={(v) => setDayFilter(v as DayFilter)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All days</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="custom">Pick date</SelectItem>
          </SelectContent>
        </Select>
        {dayFilter === "custom" && (
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
        )}
        {pendingCount > 0 && (
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={bulkDeliveryDate}
            onChange={(e) => setBulkDeliveryDate(e.target.value)}
            title="Delivery date for bulk confirm"
          />
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={groupByDay} onCheckedChange={(v) => setGroupByDay(Boolean(v))} />
          Group by day
        </label>
        {orders.length > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAllVisible} />
            Select all shown ({orders.length})
          </label>
        )}
        {pendingCount > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={allPendingSelected} onCheckedChange={toggleSelectAllPending} />
            Pending only ({pendingCount})
          </label>
        )}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize",
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {STATUS_LABEL[s as OrderStatus] ?? s}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Could not load orders</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message ?? "Admin session may have expired."}
          </p>
          <Button className="mt-4 rounded-xl" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No orders in this view.
        </p>
      )}

      {grouped.map((group) => (
        <div key={group.dayKey || group.label || "all"} className="space-y-3">
          {groupByDay && group.label ? (
            <DayGroupToolbar
              dayKey={group.dayKey}
              label={group.label}
              items={group.items}
              selected={selected}
              deliveryDate={groupDeliveryDate(group.dayKey)}
              onDeliveryDateChange={(dayKey, value) =>
                setGroupDates((prev) => ({ ...prev, [dayKey]: value }))
              }
              onToggleGroup={toggleSelectGroup}
              onApplyStatus={(orderIds, status, deliveryDate) =>
                applyBulkStatus(orderIds, status, deliveryDate)
              }
              busy={bulkMutation.isPending}
            />
          ) : null}
          {group.items.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggleSelect(o.id)}
                    aria-label={`Select order ${o.order_number}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.recipient_name} · {o.phone} ·{" "}
                      {new Date(o.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {formatDate(o.created_at)}
                    </p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">{o.address_text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                      STATUS_STYLES[o.status],
                    )}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                  <span className="text-sm font-bold">{formatINR(o.total)}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <div className="flex-1 text-xs text-muted-foreground">
                  {(o.order_items ?? []).map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
                </div>
                <Button size="sm" variant="secondary" className="h-9 gap-1.5 text-xs" asChild>
                  <Link to="/admin/orders/$id" params={{ id: o.id }}>
                    <Eye className="h-3.5 w-3.5" /> View details
                  </Link>
                </Button>
                {o.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 text-xs"
                      disabled={mutation.isPending || schedule.isPending || bulkMutation.isPending}
                      onClick={() => {
                        const date = dates[o.id] ?? o.delivery_date ?? bulkDeliveryDate;
                        if (!date) return toast.error("Pick a delivery date first");
                        schedule.mutate({ id: o.id, delivery_date: date, status: "confirmed" });
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve & schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 border-destructive/40 text-xs text-destructive"
                      disabled={mutation.isPending || bulkMutation.isPending}
                      onClick={() =>
                        bulkMutation.mutate({
                          order_ids: [o.id],
                          action: "cancelled",
                          status: "cancelled",
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <Input
                    type="date"
                    aria-label={`Delivery date for ${o.order_number}`}
                    className="h-9 w-[9.5rem] text-xs"
                    value={dates[o.id] ?? o.delivery_date ?? ""}
                    onChange={(e) => setDates({ ...dates, [o.id]: e.target.value })}
                  />
                  {(dates[o.id] ?? "") !== "" && dates[o.id] !== (o.delivery_date ?? "") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-9 text-xs"
                      disabled={schedule.isPending}
                      onClick={() => schedule.mutate({ id: o.id, delivery_date: dates[o.id]! })}
                    >
                      Save
                    </Button>
                  )}
                </div>
                <Select
                  value={o.status}
                  onValueChange={(v) => mutation.mutate({ id: o.id, status: v as OrderStatus })}
                >
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
