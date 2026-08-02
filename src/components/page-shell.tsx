import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { DesktopHeader } from "./desktop-header";
import { BackToTop, StickyCartBar } from "./cart-pill";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  withNav = true,
  withCartBar = true,
  withFooter = true,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
  withCartBar?: boolean;
  withFooter?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      {withNav && <DesktopHeader />}
      <div
        className={cn(
          "mx-auto w-full max-w-lg lg:max-w-7xl lg:px-6",
          withNav && "pb-36 lg:pb-16",
          className,
        )}
      >
        {children}
        {withNav && withFooter && <SiteFooter />}
      </div>

      {withNav && withCartBar && (
        <>
          <StickyCartBar />
          <BackToTop />
        </>
      )}
      {withNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}


export function TopBar({
  title,
  subtitle,
  action,
  backTo,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backTo?: string;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:static lg:rounded-b-3xl lg:border-x lg:px-6 lg:py-5">
      {backTo ? (
        <Link
          to={backTo}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.history.back()}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground lg:text-2xl">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground lg:text-sm">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
