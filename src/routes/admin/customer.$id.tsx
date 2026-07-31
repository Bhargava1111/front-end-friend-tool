import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Phone, Calendar, ShoppingBag, IndianRupee, Star, Mail, MapPin } from "lucide-react";
import { getAdminCustomerDetail } from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { STATUS_STYLES } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/customer/$id")({
  head: () => ({
    meta: [
      { title: "Customer Profile — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Full customer profile with order history, spend and reviews." },
      { property: "og:title", content: "Customer Profile — Admin" },
      { property: "og:description", content: "Order history, lifetime spend and delivery details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/admin/customer/$id" });
  const fetchDetail = useServerFn(getAdminCustomerDetail);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-card" />
        <div className="h-24 animate-pulse rounded-2xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Couldn't load this customer</p>
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
  if (!data?.profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Customer not found.
      </div>
    );
  }

  const { profile, orders, items, reviews, stats, addresses, returns, email, lastSignInAt } = data;
  const lastAddress = orders[0]?.address_text;

  const cards = [
    { label: "Orders", value: String(stats.orders), icon: ShoppingBag },
    { label: "Lifetime spend", value: formatINR(stats.spend), icon: IndianRupee },
    { label: "Avg order", value: formatINR(stats.avg), icon: IndianRupee },
    { label: "Cancelled", value: String(stats.cancelled), icon: ShoppingBag },
    { label: "In cart", value: String(stats.cartCount), icon: ShoppingBag },
    { label: "Wishlisted", value: String(stats.wishlistCount), icon: Star },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">
            {(profile.full_name ?? "G").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">{profile.full_name ?? "Guest customer"}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {profile.phone ?? "No phone"}
            </span>
            {email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.created_at)}
            </span>
            {lastSignInAt && <span>Last sign-in {formatDate(lastSignInAt)}</span>}
            {stats.lastOrderAt && <span>Last order {formatDate(stats.lastOrderAt)}</span>}
          </p>
          {lastAddress && <p className="mt-1 text-xs text-muted-foreground">{lastAddress}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground"
              >
                Call customer
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground"
              >
                Email customer
              </a>
            )}
            <Link
              to="/admin/orders"
              className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground"
            >
              Open orders
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Saved addresses
          </h2>
          {addresses.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No saved addresses.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {addresses.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {a.label}
                    {a.is_default && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.recipient_name} · {a.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[a.line1, a.line2, a.landmark, a.city, a.state, a.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Return requests
          </h2>
          {returns.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No returns raised.</p>
          ) : (
            <ul className="divide-y divide-border">
              {returns.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <p className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{r.reason}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize">
                      {r.status}
                    </span>
                  </p>
                  {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const lines = items.filter((it) => it.order_id === o.id);
              return (
                <div key={o.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        to="/admin/orders"
                        className="text-sm font-semibold text-foreground hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)} · {o.payment_method?.toUpperCase()}
                        {o.delivery_slot ? ` · ${o.delivery_slot}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                          STATUS_STYLES[o.status as OrderStatus],
                        )}
                      >
                        {o.status}
                      </span>
                      <span className="text-sm font-bold">{formatINR(o.total)}</span>
                    </div>
                  </div>
                  {lines.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {lines.map((l, i) => (
                        <li key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span className="truncate">
                            {l.product_name}
                            {l.variant_label ? ` · ${l.variant_label}` : ""} × {l.quantity}
                          </span>
                          <span>{formatINR(l.line_total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {o.recipient_name} · {o.phone} · {o.address_text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Reviews written
        </h2>
        {reviews.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 text-accent" /> {r.rating}/5 {r.title ? `· ${r.title}` : ""}
                </p>
                {r.body && <p className="mt-1 text-xs text-muted-foreground">{r.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
