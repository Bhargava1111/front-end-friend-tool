import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  ClipboardList,
  User,
  Navigation,
  LayoutDashboard,
  Wallet,
  Gift,
  Users,
  Languages,
  HelpCircle,
  Shield,
  FileText,
  Trash2,
  LifeBuoy,
  RefreshCcw,
  Eye,
  Star,
  PackageSearch,
  Bookmark,
  Bell,
  TrendingDown,
  GitCompareArrows,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-shop";
import { clearSession } from "@/lib/auth-store";
import { getProfile } from "@/lib/shop.functions";
import { deleteAccountClient } from "@/lib/platform.functions";
import { PageShell } from "@/components/page-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { displayEmail } from "@/lib/profile-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({
    meta: [
      { title: "My Profile — Sri Mahalakshmi Stores" },
      { name: "description", content: "Manage your details, addresses, wishlist and orders." },
      { property: "og:title", content: "My Profile — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Your account at Sri Mahalakshmi Stores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, signOut } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile() as Promise<Profile>,
    enabled: !!session,
  });

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    "Welcome";
  const initials = (displayName || user?.email || "G").slice(0, 1).toUpperCase();
  const email = displayEmail(profile?.email) || user?.email;
  const isAdmin = user?.role === "admin";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    signOut();
    clearSession();
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/profile/photo", label: "Profile photo", icon: Camera },
    { to: "/profile/details", label: "Personal details", icon: User },
    { to: "/orders", label: "My Orders", icon: ClipboardList },
    { to: "/track-order", label: "Track order", icon: PackageSearch },
    { to: "/wishlist", label: "Wishlist", icon: Heart },
    { to: "/reorder", label: "Reorder", icon: RefreshCcw },
    { to: "/saved-items", label: "Saved for later", icon: Bookmark },
    { to: "/recently-viewed", label: "Recently viewed", icon: Eye },
    { to: "/compare", label: "Compare products", icon: GitCompareArrows },
    { to: "/subscriptions", label: "Subscribe & save", icon: RefreshCcw },
    { to: "/price-alerts", label: "Price alerts", icon: TrendingDown },
    { to: "/my-reviews", label: "My reviews", icon: Star },
    { to: "/notification-settings", label: "Notification settings", icon: Bell },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/rewards", label: "Rewards & Points", icon: Gift },
    { to: "/referral", label: "Refer & Earn", icon: Users },
    { to: "/membership", label: "Membership", icon: Gift },
    { to: "/addresses", label: "Saved Addresses", icon: MapPin },
    { to: "/language", label: "Language", icon: Languages },
    { to: "/support", label: "My support tickets", icon: HelpCircle },
    { to: "/help", label: "Help center", icon: LifeBuoy },
    { to: "/privacy", label: "Privacy Policy", icon: Shield },
    { to: "/terms", label: "Terms & Conditions", icon: FileText },
    { to: "/stores", label: "Store Locator", icon: Navigation },
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: LayoutDashboard }] : []),
  ];

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-gradient-to-br from-primary via-primary to-primary/85 px-4 pb-7 pt-7 text-primary-foreground">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/profile/photo"
              className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-foreground/15 text-xl font-bold"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-primary-foreground text-primary">
                <Camera className="h-3 w-3" />
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{displayName}</h1>
              <p className="truncate text-sm text-primary-foreground/75">{email}</p>
            </div>
          </div>
          <ThemeToggle className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground" />
        </div>
      </header>

      <nav className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card card-elevated">
        {navItems.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50",
              i > 0 && "border-t border-border",
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <div className="space-y-2 p-4">
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
        <Button
          variant="ghost"
          className="h-11 w-full rounded-xl text-muted-foreground"
          onClick={async () => {
            if (!confirm("Delete your account permanently? This cannot be undone.")) return;
            try {
              await deleteAccountClient();
              await handleSignOut();
              toast.success("Account deleted");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not delete account");
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete account
        </Button>
      </div>
    </PageShell>
  );
}
