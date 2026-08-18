import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared header for admin create/edit full pages (replaces modal dialogs). */
export function AdminFormShell({
  backTo,
  backLabel,
  title,
  description,
  children,
  className,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl space-y-5", className)}>
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 card-elevated">{children}</div>
    </div>
  );
}
