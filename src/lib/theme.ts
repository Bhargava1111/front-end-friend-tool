import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sms-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ThemeState = {
  theme: Theme;
  hydrated: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  hydrate: () => void;
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "light",
  hydrated: false,
  setTheme: (theme) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  hydrate: () => {
    const theme = readTheme();
    applyTheme(theme);
    set({ theme, hydrated: true });
  },
}));

/** Inline script that applies the stored theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var k=localStorage.getItem("${STORAGE_KEY}");var d=k?k==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
