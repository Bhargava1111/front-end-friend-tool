import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminDashboardClient } from "@/lib/admin-client.functions";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndianRupee, ShoppingBag, Users, PackageX, TrendingUp, Zap, Megaphone, ShoppingCart } from "lucide-react";
import { getAdminDashboard } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Sri Mahalakshmi Stores" },
      { name: "description", content: "Revenue, orders, customers and product analytics." },
      { property: "og:title", content: "Admin Dashboard — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Store performance at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const PIE_COLORS = ["#F2A413", "#1F5136", "#4F8A6B", "#C98A10", "#B23B3B"];

function Dashboard() {
  const fetchDashboard = useAdminFn(getAdminDashboard, getAdminDashboardClient);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    );
  }

  const days = data.days ?? [];
  const statusCounts = data.statusCounts ?? [];
  const topProducts = data.topProducts ?? [];
  const recentOrders = data.recentOrders ?? [];

  const stats = [
    { label: "Revenue", value: formatINR(data.revenue ?? 0), icon: IndianRupee },
    { label: "Orders", value: String(data.orderCount ?? 0), icon: ShoppingBag },
    { label: "Customers", value: String(data.customerCount ?? 0), icon: Users },
    { label: "Avg order", value: formatINR(data.avgOrderValue ?? 0), icon: TrendingUp },
    { label: "Products", value: String(data.productCount ?? 0), icon: ShoppingBag },
    { label: "Low stock", value: String(data.lowStock ?? 0), icon: PackageX },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/admin/orders/new", label: "New order", icon: ShoppingBag, tone: "bg-primary-soft text-primary" },
          { to: "/admin/products/new", label: "Add product", icon: PackageX, tone: "bg-accent-soft text-accent-foreground" },
          { to: "/admin/marketing", label: "Marketing", icon: Megaphone, tone: "bg-secondary text-foreground" },
          { to: "/admin/abandoned-carts", label: "Recover carts", icon: ShoppingCart, tone: "bg-destructive/10 text-destructive" },
        ].map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tone)}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Revenue — last 14 days</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F2A413" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#F2A413" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F2A413"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Orders by status</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusCounts.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="h-4 w-4 text-accent" /> Live activity
          </h2>
          <div className="mt-3 space-y-2">
            {[
              { text: "New order #SMS-0042 — ₹1,240", time: "2 min ago" },
              { text: "Priya S. left a 5★ review", time: "8 min ago" },
              { text: "Low stock: Cow Ghee 500ml (3 left)", time: "15 min ago" },
              { text: "Cart abandoned — ₹1,840 at checkout", time: "22 min ago" },
              { text: "New customer registered", time: "35 min ago" },
            ].map((a) => (
              <div key={a.text} className="rounded-xl bg-secondary/40 px-3 py-2">
                <p className="text-xs font-medium text-foreground">{a.text}</p>
                <p className="text-[10px] text-muted-foreground">{a.time}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Link to="/admin/analytics" className="text-xs font-semibold text-primary">
              View analytics →
            </Link>
            <Link to="/admin/inventory" className="text-xs font-semibold text-primary">
              Inventory →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Top products by revenue</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="revenue" fill="#1F5136" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
          <div className="mt-3 divide-y divide-border">
            {recentOrders.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{o.order_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.recipient_name} · {formatDate(o.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                      STATUS_STYLES[o.status as OrderStatus],
                    )}
                  >
                    {o.status}
                  </span>
                  <span className="text-sm font-semibold">{formatINR(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
