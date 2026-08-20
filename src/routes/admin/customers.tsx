import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminCustomersClient, getAdminCustomerDetailClient } from "@/lib/admin-client.functions";

import { ChevronRight } from "lucide-react";
import { getAdminCustomers, getAdminCustomerDetail } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customer Analytics — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Customer list with order counts and lifetime spend." },
      { property: "og:title", content: "Customer Analytics — Admin" },
      { property: "og:description", content: "Understand who is shopping and how much they spend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const queryClient = useQueryClient();
  const fetchCustomers = useAdminFn(getAdminCustomers, getAdminCustomersClient);
  const fetchDetail = useAdminFn(getAdminCustomerDetail, getAdminCustomerDetailClient);
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
    staleTime: 30_000,
    retry: 1,
  });

  const prefetchCustomer = (id: string) => {
    void queryClient.prefetchQuery({
      queryKey: ["admin-customer", id],
      queryFn: () => fetchDetail({ data: { id } }),
      staleTime: 30_000,
    });
  };

  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const rows = term
    ? data.filter(
        (c) =>
          (c.full_name ?? "").toLowerCase().includes(term) ||
          (c.phone ?? "").includes(term) ||
          (c.gst_number ?? "").toLowerCase().includes(term) ||
          (c.email ?? "").toLowerCase().includes(term),
      )
    : data;

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-card" />;
  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Couldn't load customers</p>
        <p className="mt-1 text-xs text-muted-foreground">{(error as Error)?.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground">{rows.length} of {data.length} shown</p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, GST or email"
          className="max-w-[220px]"
          aria-label="Search customers"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Spend</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                No customers yet.
              </td>
            </tr>
          )}
          {rows.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-secondary/40">
              <td className="px-4 py-3 font-medium text-foreground">
                <Link
                  to="/admin/customer/$id"
                  params={{ id: c.id }}
                  onMouseEnter={() => prefetchCustomer(c.id)}
                  onFocus={() => prefetchCustomer(c.id)}
                  className="flex items-center gap-2 hover:underline"
                >
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {(c.full_name ?? "G").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate">{c.full_name ?? "Guest"}</span>
                    {c.gst_number && (
                      <span className="block truncate text-[11px] font-normal text-muted-foreground">
                        GST: {c.gst_number}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
              <td className="px-4 py-3 text-right">{c.orders}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatINR(c.spend)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  to="/admin/customer/$id"
                  params={{ id: c.id }}
                  onMouseEnter={() => prefetchCustomer(c.id)}
                  onFocus={() => prefetchCustomer(c.id)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground"
                >
                  View details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
