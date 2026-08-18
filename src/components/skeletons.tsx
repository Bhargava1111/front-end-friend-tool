import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export function RailSkeleton() {
  return (
    <section className="mt-7">
      <div className="px-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ProductCardSkeleton key={i} className="w-[150px] shrink-0" />
        ))}
      </div>
    </section>
  );
}

export function HomeSkeleton() {
  return (
    <div className="pb-10">
      <Skeleton className="h-52 rounded-b-3xl rounded-t-none" />
      <div className="px-4 pt-5">
        <Skeleton className="aspect-[16/9] rounded-3xl" />
      </div>
      <div className="no-scrollbar mt-7 flex gap-3 px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-[76px] shrink-0 rounded-2xl" />
        ))}
      </div>
      <RailSkeleton />
      <RailSkeleton />
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
