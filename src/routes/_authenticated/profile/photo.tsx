import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera } from "lucide-react";
import { useSession } from "@/hooks/use-shop";
import { getProfile } from "@/lib/shop.functions";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { PageShell } from "@/components/page-shell";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/profile/photo")({
  head: () => ({
    meta: [
      { title: "Profile Photo — Sri Mahalakshmi Stores" },
      { name: "description", content: "Upload or remove your profile photo." },
    ],
  }),
  component: ProfilePhotoPage,
});

function ProfilePhotoPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const fetchProfile = getProfile;

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile() as Promise<Profile>,
    enabled: !!session,
  });

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
    || profile?.full_name
    || "User";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <PageShell withCartBar={false}>
      <header className="border-b border-border px-4 py-4">
        <Link
          to="/profile"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Camera className="h-5 w-5 text-primary" /> Profile photo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo so we can recognise you on orders and support tickets.
        </p>
      </header>

      <section className="p-4">
        <div className="rounded-2xl border border-border bg-card p-6 card-elevated">
          <ProfileAvatarUpload
            value={profile?.avatar_url ?? ""}
            initials={initials}
            onChange={() => {
              void queryClient.invalidateQueries({ queryKey: ["profile"] });
            }}
          />
        </div>
      </section>
    </PageShell>
  );
}
