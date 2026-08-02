import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  UserCheck,
  Store as StoreIcon,
  ShieldAlert,
  ArrowLeft,
  LayoutGrid,
  Images,
  Tag,
  TicketPercent,
  Star,
  PackageX,
  Bell,
  Settings,
  BarChart3,
  Newspaper,
  Menu,
} from "lucide-react";
import { getAdminStatus } from "@/lib/admin.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

const groups = [
  {
    label: "Overview",
    links: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Selling",
    links: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/returns", label: "Returns", icon: PackageX },
      { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "Catalogue",
    links: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
      { to: "/admin/brands", label: "Brands", icon: Tag },
      { to: "/admin/banners", label: "Banners", icon: Images },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "People & content",
    links: [
      { to: "/admin/users", label: "Users", icon: UserCheck },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
      { to: "/admin/notifications", label: "Notify", icon: Bell },
    ],
  },
  {
    label: "Store",
    links: [
      { to: "/admin/stores", label: "Store & delivery", icon: StoreIcon },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.links.map(({ to, label, icon: Icon, ...rest }) => {
              const exact = "exact" in rest && rest.exact;
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminLayout() {
  const check = useServerFn(getAdminStatus);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawer, setDrawer] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => check() as Promise<{ isAdmin: boolean }>,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data?.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-foreground">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with an admin account to manage the store. Ask an existing admin to grant your
            account the admin role.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            SM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Admin panel</p>
            <p className="truncate text-[11px] text-muted-foreground">Sri Mahalakshmi Stores</p>
          </div>
        </div>
        <div className="px-2 pb-8">
          <NavList pathname={pathname} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-5">
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open admin menu"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border lg:hidden"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetHeader className="text-left">
                  <SheetTitle>Admin panel</SheetTitle>
                </SheetHeader>
                <div className="pt-3">
                  <NavList pathname={pathname} onNavigate={() => setDrawer(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {groups
                  .flatMap((g) => g.links)
                  .filter((l) => ("exact" in l && l.exact ? pathname === l.to : pathname.startsWith(l.to)))
                  .slice(-1)[0]?.label ?? "Admin"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Manage your store</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <Link
                to="/"
                className="hidden rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground sm:block"
              >
                View store
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
