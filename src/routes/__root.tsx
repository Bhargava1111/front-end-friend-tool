import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ChatSupport } from "@/components/chat-support";
import { AppUpdateDialog } from "@/components/app-update-dialog";
import { CapacitorShell } from "@/components/capacitor-shell";
import { IosInstallPrompt } from "@/components/ios-install-prompt";
import { LanguageSync } from "@/components/language-sync";
import { PushNotifications } from "@/components/push-notifications";
import { AdminNotificationAlerts } from "@/components/admin-notification-alerts";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { themeInitScript } from "@/lib/theme";
import { env } from "@/lib/env";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {typeof navigator !== "undefined" && navigator.onLine === false
            ? "You're offline"
            : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {typeof navigator !== "undefined" && navigator.onLine === false
            ? "Connect to the internet to refresh. Saved store data will show when the page can load from cache."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-soft"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    $_TSR?: unknown;
  }
}

function shouldUseDocumentShell() {
  return typeof window === "undefined" || Boolean(window.$_TSR);
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no",
      },
      { title: "Sri Mahalakshmi Stores — Grocery & Pooja Essentials" },
      {
        name: "description",
        content:
          "Order fresh groceries and authentic pooja essentials online with fast doorstep delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SM Stores" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#2d5a45" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: env.googleFontsPreconnect },
      { rel: "preconnect", href: env.googleFontsStaticPreconnect, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: env.googleFontsUrl },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "shortcut icon", href: "/icon-192.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: shouldUseDocumentShell() ? RootShell : undefined,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CapacitorShell />
      <LanguageSync />
      <PushNotifications />
      <AdminNotificationAlerts />
      <IosInstallPrompt />
      <Outlet />
      <ChatSupport />
      <AppUpdateDialog />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
