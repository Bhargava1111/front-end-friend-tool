import { useRef } from "react";

/**
 * Auto-scrolling rails are disabled across the app by request.
 * The hook is kept as a no-op ref provider so call sites stay unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useAutoScroll<T extends HTMLElement>(_enabled = true, _speed = 0.35) {
  return useRef<T | null>(null);
}
