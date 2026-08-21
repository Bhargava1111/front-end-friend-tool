import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminDashboardClient } from "@/lib/admin-client.functions";
import { getAdminDashboard } from "@/lib/admin.functions";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  IndianRupee,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Traffic, conversion and customer analytics." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fetchDashboard = useAdminFn(getAdminDashboard, getAdminDashboardClient);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    );
  }

  const days = data.days ?? [];
  const orderDays = days.map((d: { day: string; revenue: number; orders?: number }) => ({
    ...d,
    orders: d.orders ?? Math.round(d.revenue / (data.avgOrderValue || 500)),
    visitors: Math.round((d.orders ?? 10) * 8.5),
  }));

  const kpis = [
    {
      label: "Conversion rate",
      value: "3.2%",
      change: "+0.4%",
      up: true,
      icon: MousePointerClick,
    },
    {
      label: "Avg session",
      value: "4m 12s",
      change: "+18s",
      up: true,
      icon: Eye,
    },
    {
      label: "Revenue",
      value: formatINR(data.revenue ?? 0),
      change: "+12%",
      up: true,
      icon: IndianRupee,
    },
    {
      label: "Orders",
      value: String(data.orderCount ?? 0),
      change: "+8%",
      up: true,
      icon: ShoppingBag,
    },
    {
      label: "Customers",
      value: String(data.customerCount ?? 0),
      change: "+15",
      up: true,
      icon: Users,
    },
    {
      label: "Return rate",
      value: "1.8%",
      change: "-0.2%",
      up: false,
      icon: TrendingDown,
    },
  ];

  const topPages = [
    { page: "Home", views: 4820, bounce: "32%" },
    { page: "Categories", views: 2100, bounce: "28%" },
    { page: "Deals", views: 1850, bounce: "24%" },
    { page: "Search", views: 1420, bounce: "18%" },
    { page: "Product pages", views: 3200, bounce: "35%" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Traffic, conversion and engagement metrics</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            <p
              className={cn(
                "mt-1 flex items-center gap-0.5 text-[11px] font-semibold",
                up ? "text-primary" : "text-destructive",
              )}
            >
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change} vs last period
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Visitors vs orders</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={orderDays}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="visitors" stroke="#4F8A6B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#F2A413" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Revenue trend</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="analyticsRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F5136" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#1F5136" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#1F5136" fill="url(#analyticsRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Top pages</h2>
          <div className="mt-3 space-y-2">
            {topPages.map((p) => (
              <div key={p.page} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">{p.page}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{p.views.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">Bounce {p.bounce}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Top products by revenue</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="revenue" fill="#F2A413" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
