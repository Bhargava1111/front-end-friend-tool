import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 14,
  className,
  onChange,
}: {
  value: number;
  size?: number;
  className?: string;
  onChange?: (v: number) => void;
}) {
  const stars = [1, 2, 3, 4, 5];
  if (onChange) {
    return (
      <div className={cn("flex items-center gap-1", className)} role="radiogroup" aria-label="Rating">
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={`${s} star${s === 1 ? "" : "s"}`}
            onClick={() => onChange(s)}
            className="grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90"
          >
            <Star
              style={{ width: size + 6, height: size + 6 }}
              className={cn(s <= value ? "fill-accent text-accent" : "text-muted-foreground/50")}
            />
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {stars.map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={cn(
            s <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
