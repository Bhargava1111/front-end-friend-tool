import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"] as const;

/** Logs out of the admin panel after idle timeout (default 10 minutes). */
export function useAdminIdle({
  enabled,
  timeoutMs,
  onIdle,
}: {
  enabled: boolean;
  timeoutMs: number;
  onIdle: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    reset();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, [enabled, timeoutMs]);
}
