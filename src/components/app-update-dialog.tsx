import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAppUpdate } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";

export const APP_VERSION = "2.4.0";

const WHATS_NEW = [
  "Coupons, taxes and delivery slots at checkout",
  "Ratings, reviews and frequently bought together",
  "Wallet, reward points and referrals",
];

export function AppUpdateDialog() {
  const hydrated = useHydrated();
  const dismissedVersion = useAppUpdate((s) => s.dismissedVersion);
  const dismiss = useAppUpdate((s) => s.dismiss);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (dismissedVersion === APP_VERSION) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [hydrated, dismissedVersion]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
      className="fixed inset-0 z-[80] grid place-items-end bg-foreground/40 p-4 backdrop-blur-sm sm:place-items-center"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 card-elevated">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 id="app-update-title" className="mt-4 text-lg font-bold text-foreground">
          What&apos;s new in {APP_VERSION}
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {WHATS_NEW.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => {
              dismiss(APP_VERSION);
              setVisible(false);
            }}
          >
            Later
          </Button>
          <Button
            className="h-11 flex-1 rounded-xl"
            onClick={() => {
              dismiss(APP_VERSION);
              setVisible(false);
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
