import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Choose a new password for your Sri Mahalakshmi Stores account.",
      },
      { property: "og:title", content: "Reset your password" },
      {
        property: "og:description",
        content: "Set a new password to get back to your groceries and pooja orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-center text-lg font-semibold text-foreground">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          {ready
            ? "Enter a new password for your account."
            : "Open this page from the reset link in your email."}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              minLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={busy || !ready}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
