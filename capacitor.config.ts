import type { CapacitorConfig } from "@capacitor/cli";
import fs from "node:fs";
import path from "node:path";

const basePlugins: CapacitorConfig["plugins"] = {
  SplashScreen: {
    launchShowDuration: 1800,
    launchAutoHide: true,
    backgroundColor: "#2d5a45",
    androidSplashResourceName: "splash",
    androidScaleType: "CENTER_CROP",
    showSpinner: false,
    splashFullScreen: true,
    splashImmersive: true,
  },
  StatusBar: {
    style: "LIGHT",
    backgroundColor: "#2d5a45",
  },
  Keyboard: {
    resize: "body",
    resizeOnFullScreen: true,
  },
};

/** Prefer LAN URL from mobile-config — never defaults to Lovable. */
function readMobileServerUrl(): string | null {
  try {
    const configPath = path.join(process.cwd(), "mobile", "capacitor.server.json");
    if (!fs.existsSync(configPath)) return null;
    const data = JSON.parse(fs.readFileSync(configPath, "utf8")) as { serverUrl?: string };
    return data.serverUrl?.trim() || null;
  } catch {
    return null;
  }
}

const serverUrl = readMobileServerUrl() || process.env.CAPACITOR_SERVER_URL?.trim() || null;

function buildConfig(): CapacitorConfig {
  if (!serverUrl) {
    return {
      appId: "in.srimahalakshmistores.app",
      appName: "Sri Mahalakshmi Stores",
      webDir: "mobile/www",
      android: { backgroundColor: "#2d5a45" },
      ios: {
        backgroundColor: "#2d5a45",
        contentInset: "automatic",
        scrollEnabled: true,
      },
      plugins: basePlugins,
    };
  }

  const useHttps = serverUrl.startsWith("https://");
  const isLocalDev = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./.test(serverUrl);
  const resolvedUrl =
    isLocalDev && useHttps && process.env.MOBILE_HTTPS !== "1"
      ? serverUrl.replace(/^https:\/\//, "http://")
      : serverUrl;
  const resolvedHttps = resolvedUrl.startsWith("https://");

  return {
    appId: "in.srimahalakshmistores.app",
    appName: "Sri Mahalakshmi Stores",
    webDir: "mobile/www",
    server: {
      url: resolvedUrl,
      cleartext: !resolvedHttps,
      androidScheme: resolvedHttps ? "https" : "http",
    },
    android: {
      allowMixedContent: isLocalDev,
      backgroundColor: "#2d5a45",
    },
    ios: {
      backgroundColor: "#2d5a45",
      contentInset: "automatic",
      scrollEnabled: true,
    },
    plugins: basePlugins,
  };
}

const config = buildConfig();
export default config;
