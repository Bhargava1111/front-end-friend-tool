import { createFileRoute } from "@tanstack/react-router";
import { Share } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { env } from "@/lib/env";

export const Route = createFileRoute("/install-ios")({
  component: InstallIosPage,
});

function InstallIosPage() {
  return (
    <PageShell withNav={false} withCartBar={false} withFooter={false}>
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground">
          SM
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Install on iPhone</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Same app as Android — groceries, cart, checkout, and your Django backend.
        </p>

        <ol className="mt-8 space-y-4 text-left text-sm text-foreground">
          <li className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <span>
              On your PC, run <code className="rounded bg-muted px-1">npm run backend:mobile</code> and{" "}
              <code className="rounded bg-muted px-1">npm run dev:mobile</code>
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <span>
              In Safari, open <strong>{env.appUrl}</strong> (same Wi‑Fi as PC). Tap Advanced →
              Proceed if certificate warning appears.
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <span className="flex items-center gap-1">
              Tap <Share className="h-4 w-4 text-primary" /> Share at the bottom of Safari
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              4
            </span>
            <span>
              Scroll and tap <strong>Add to Home Screen</strong> → <strong>Add</strong>
            </span>
          </li>
        </ol>

        <p className="mt-8 text-xs text-muted-foreground">
          Apple does not allow downloading .ipa files like Android APK without a Mac and App Store. This
          installs the same app on your home screen.
        </p>
      </div>
    </PageShell>
  );
}
