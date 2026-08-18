import { Capacitor } from "@capacitor/core";

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();

async function ensureNativeLocationPermission() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      await Geolocation.requestPermissions();
    }
  } catch {
    // Permission flow runs again when user taps "Use my location".
  }
}

export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("native-app", `platform-${Capacitor.getPlatform()}`);

  void ensureNativeLocationPermission();

  const [{ App }, { StatusBar, Style }, { SplashScreen }, { Keyboard }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
    import("@capacitor/keyboard"),
  ]);

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#2d5a45" });
    }
  } catch {
    // Status bar APIs are unavailable in some WebView builds.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash may already be hidden.
  }

  Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);

  // Open external links (Maps, WhatsApp, etc.) in the system browser.
  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor?.href) return;
    try {
      const url = new URL(anchor.href);
      if (url.origin === window.location.origin) return;
      if (!/^https?:$/i.test(url.protocol)) return;
      event.preventDefault();
      void import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: anchor.href }));
    } catch {
      // ignore malformed hrefs
    }
  });

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    App.exitApp();
  });
}
