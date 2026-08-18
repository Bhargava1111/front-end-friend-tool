import { useEffect } from "react";
import { initNativeShell } from "@/lib/capacitor";

/** Boots native status bar, splash, keyboard, and Android back-button handling. */
export function CapacitorShell() {
  useEffect(() => {
    void initNativeShell();
  }, []);

  return null;
}
