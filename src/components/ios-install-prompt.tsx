import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    typeof window !== "undefined" &&
    ("standalone" in window.navigator
      ? (window.navigator as Navigator & { standalone?: boolean }).standalone
      : window.matchMedia("(display-mode: standalone)").matches);
  return ios && !standalone;
}

const DISMISS_KEY = "sms-ios-install-dismissed";

/** Prompts iPhone Safari users to Add to Home Screen (installable web app). */
export function IosInstallPrompt() {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hydrated || Capacitor.isNativePlatform() || !isIosSafari()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [hydrated]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-[70] px-4 pb-[env(safe-area-inset-bottom)] lg:bottom-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 shadow-lg card-elevated">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            SM
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Install on iPhone</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tap <Share className="mb-0.5 inline h-3.5 w-3.5" /> Share, then{" "}
              <strong>Add to Home Screen</strong> for the full app experience with GPS.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-muted-foreground"
            aria-label="Dismiss"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setVisible(false);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button
          className="mt-3 h-10 w-full rounded-xl"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
