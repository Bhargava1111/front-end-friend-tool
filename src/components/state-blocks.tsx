import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-4 my-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-6 text-center"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {description ?? "Please check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function SuccessState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="grid h-20 w-20 animate-[scale-in_0.3s_ease-out] place-items-center rounded-full bg-primary-soft text-primary">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 rounded-2xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
