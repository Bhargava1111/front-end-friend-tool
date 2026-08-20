import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminSalesReportClient } from "@/lib/admin-client.functions";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, IndianRupee, ShoppingBag, TrendingUp, XCircle } from "lucide-react";
import { getAdminSalesReport, type SalesGranularity } from "@/lib/admin-ops.functions";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Sales Reports — Admin | Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Filter revenue and orders by day, week or month and download CSV reports.",
      },
      { property: "og:title", content: "Sales Reports — Admin" },
      { property: "og:description", content: "Revenue, orders and product performance reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReports,
});

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Today", days: 0, granularity: "day" as SalesGranularity },
  { label: "7 days", days: 6, granularity: "day" as SalesGranularity },
  { label: "30 days", days: 29, granularity: "day" as SalesGranularity },
  { label: "12 weeks", days: 83, granularity: "week" as SalesGranularity },
  { label: "12 months", days: 364, granularity: "month" as SalesGranularity },
];

function downloadCsv(name: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminReports() {
  const fetchReport = useAdminFn(getAdminSalesReport, getAdminSalesReportClient);
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [granularity, setGranularity] = useState<SalesGranularity>("day");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report", from, to, granularity],
    queryFn: () => fetchReport({ data: { from, to, granularity } }),
  });

  const stats = useMemo(
    () => [
      { label: "Revenue", value: formatINR(data?.totals.revenue ?? 0), icon: IndianRupee },
      { label: "Orders", value: String(data?.totals.orders ?? 0), icon: ShoppingBag },
      { label: "Avg order", value: formatINR(data?.totals.avgOrderValue ?? 0), icon: TrendingUp },
      { label: "Cancelled", value: String(data?.totals.cancelled ?? 0), icon: XCircle },
    ],
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">Sales reports</h1>
          <p className="text-xs text-muted-foreground">
            Day, week and month performance with CSV exports
          </p>
        </div>
        <Button
          variant="secondary"
          className="shrink-0 gap-2"
          disabled={!(data?.orders?.length)}
          onClick={() =>
            downloadCsv(
              `orders-${from}-to-${to}.csv`,
              (data?.orders ?? []).map((o) => ({
                order_number: o.order_number,
                date: o.created_at,
                status: o.status,
                customer: o.recipient_name,
                phone: o.phone,
                payment: o.payment_method ?? "",
                delivery_date: o.delivery_date ?? "",
                subtotal: Number(o.subtotal),
                discount: Number(o.discount ?? 0),
                tax: Number(o.tax ?? 0),
                delivery_fee: Number(o.delivery_fee ?? 0),
                total: Number(o.total),
              })),
            )
          }
        >
          <Download className="h-4 w-4" /> Orders CSV
        </Button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setFrom(isoDaysAgo(p.days));
                setTo(isoDaysAgo(0));
                setGranularity(p.granularity);
              }}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="r-from">From</Label>
            <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="r-to">To</Label>
            <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Group by</Label>
            <div className="mt-1 flex gap-1.5">
              {(["day", "week", "month"] as SalesGranularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-2 text-xs font-medium capitalize",
                    granularity === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Revenue by {granularity}</h2>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            disabled={!(data?.buckets?.length)}
            onClick={() =>
              downloadCsv(
                `revenue-${granularity}-${from}-to-${to}.csv`,
                (data?.buckets ?? []).map((b) => ({
                  period: b.bucket,
                  revenue: Math.round(b.revenue),
                  orders: b.orders,
                })),
              )
            }
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.buckets ?? []}>
              <defs>
                <linearGradient id="revRep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F2A413" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#F2A413" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F2A413"
                strokeWidth={2}
                fill="url(#revRep)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Top products</h2>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              disabled={!(data?.topProducts?.length)}
              onClick={() =>
                downloadCsv(
                  `top-products-${from}-to-${to}.csv`,
                  (data?.topProducts ?? []).map((p) => ({
                    product: p.name,
                    quantity: p.qty,
                    revenue: Math.round(p.revenue),
                  })),
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topProducts ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="revenue" fill="#1F5136" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Orders in range
          </h2>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.orders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      No orders in this range.
                    </td>
                  </tr>
                )}
                {(data?.orders ?? []).map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 font-medium text-foreground">{o.order_number}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{o.status}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatINR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
