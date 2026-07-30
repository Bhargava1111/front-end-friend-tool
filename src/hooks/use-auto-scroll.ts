import { useEffect, useRef } from "react";

/**
 * Slow, continuous horizontal auto-scroll for product rails.
 * Pauses on hover / touch / focus and respects prefers-reduced-motion.
 */
export function useAutoScroll<T extends HTMLElement>(
  enabled = true,
  speed = 0.35,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let paused = false;
    let frame = 0;
    let last = performance.now();

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      const max = el.scrollWidth - el.clientWidth;
      if (!paused && max > 8) {
        const next = el.scrollLeft + (speed * dt) / 16;
        el.scrollLeft = next >= max - 0.5 ? 0 : next;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [enabled, speed]);

  return ref;
}
