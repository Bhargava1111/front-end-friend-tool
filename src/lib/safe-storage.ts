import type { StateStorage } from "zustand/middleware";

const memory = new Map<string, string>();

/** SSR-safe storage for zustand persist — avoids localStorage throws during server render. */
export function createSafeStorage(): StateStorage {
  if (typeof window === "undefined") {
    return {
      getItem: (name) => memory.get(name) ?? null,
      setItem: (name, value) => {
        memory.set(name, value);
      },
      removeItem: (name) => {
        memory.delete(name);
      },
    };
  }

  try {
    const probe = "__sms_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return {
      getItem: (name) => memory.get(name) ?? null,
      setItem: (name, value) => {
        memory.set(name, value);
      },
      removeItem: (name) => {
        memory.delete(name);
      },
    };
  }
}
