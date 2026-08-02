import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Six-box one-time-code input with paste, arrow-key and backspace handling. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus = true,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const setAt = (index: number, digit: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s/g, "").slice(0, length));
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="One-time code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (!digits) {
              setAt(i, "");
              return;
            }
            if (digits.length > 1) {
              onChange((value.slice(0, i) + digits).replace(/\D/g, "").slice(0, length));
              refs.current[Math.min(length - 1, i + digits.length)]?.focus();
              return;
            }
            setAt(i, digits);
            refs.current[Math.min(length - 1, i + 1)]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (digits) {
              onChange(digits);
              refs.current[Math.min(length - 1, digits.length - 1)]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]) refs.current[Math.max(0, i - 1)]?.focus();
            if (e.key === "ArrowLeft") refs.current[Math.max(0, i - 1)]?.focus();
            if (e.key === "ArrowRight") refs.current[Math.min(length - 1, i + 1)]?.focus();
          }}
          className={cn(
            "h-13 w-full min-w-0 rounded-xl border-2 bg-card text-center text-lg font-bold text-foreground outline-none transition-colors",
            "h-12 sm:h-14 sm:text-xl",
            value[i] ? "border-primary" : "border-border",
            "focus:border-primary focus:ring-2 focus:ring-primary/25",
            disabled && "opacity-60",
          )}
        />
      ))}
    </div>
  );
}
