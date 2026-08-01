import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  ClipboardList,
  User,
  Navigation,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-shop";
import { getProfile, updateProfile } from "@/lib/shop.functions";
import { PageShell } from "@/components/page-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/profile")({
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
  const { user, session } = useSession();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile() as Promise<Profile>,
    enabled: !!session,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { full_name: fullName, phone } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (fullName || user?.email || "G").slice(0, 1).toUpperCase();

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-gradient-to-br from-primary via-primary to-primary/85 px-4 pb-7 pt-7 text-primary-foreground">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-foreground/15 text-xl font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{fullName || "Welcome"}</h1>
            <p className="truncate text-sm text-primary-foreground/75">{user?.email}</p>
          </div>
          </div>
          <ThemeToggle className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground" />
        </div>
      </header>

      <nav className="space-y-2.5 p-4">
        {[
          { to: "/orders", label: "My Orders", icon: ClipboardList },
          { to: "/wishlist", label: "Wishlist", icon: Heart },
          { to: "/addresses", label: "Saved Addresses", icon: MapPin },
          { to: "/stores", label: "Store Locator & Delivery Areas", icon: Navigation },
          { to: "/admin", label: "Admin Panel", icon: LayoutDashboard },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 card-elevated"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <section className="px-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-primary" /> Personal details
        </h2>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tel">Phone</Label>
            <Input id="tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            className="w-full rounded-xl"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save changes
          </Button>
        </div>
      </section>

      <div className="p-4">
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </PageShell>
  );
}
