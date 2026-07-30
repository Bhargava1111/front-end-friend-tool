import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminCustomers } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";

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
  const fetchCustomers = useServerFn(getAdminCustomers);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-card" />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Orders</th>
            <th className="px-4 py-3 text-right">Spend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                No customers yet.
              </td>
            </tr>
          )}
          {data.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium text-foreground">{c.full_name ?? "Guest"}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
              <td className="px-4 py-3 text-right">{c.orders}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatINR(c.spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
