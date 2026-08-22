import { useHydrated } from "@/hooks/use-hydrated";
import { useCartCount } from "@/hooks/use-shop";
import { cn } from "@/lib/utils";

type CartCountBadgeProps = {
  className?: string;
};

/** Cart quantity badge — defers to client hydration to avoid SSR mismatch. */
export function CartCountBadge({ className }: CartCountBadgeProps) {
  const hydrated = useHydrated();
  const count = useCartCount();

  if (!hydrated || count <= 0) return null;

  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground",
        className,
      )}
    >
      {count}
    </span>
  );
}
