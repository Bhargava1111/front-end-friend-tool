/** Centralized environment configuration — no hardcoded URLs elsewhere. */

function read(key: string, fallback = ""): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return String(import.meta.env[key]);
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return String(process.env[key]);
  }
  return fallback;
}

const DEFAULT_VPS_HOST = "200.234.39.88";
const DEFAULT_VPS_API = `http://${DEFAULT_VPS_HOST}/api/v1`;

export const env = {
  /** Browser/client API base (relative or absolute). */
  apiUrl: read("VITE_API_URL", "/api/v1"),
  /** Server-side API base for TanStack server functions. */
  serverApiUrl: read("API_URL", read("VITE_VPS_API_URL", DEFAULT_VPS_API)),
  /** Live store API used by mobile APK and remote web deployments. */
  vpsApiUrl: read("VITE_VPS_API_URL", DEFAULT_VPS_API),
  /** Vite dev proxy target for /api/v1. */
  apiProxyTarget: read("VITE_API_PROXY_TARGET", `http://${DEFAULT_VPS_HOST}`),
  /** Public web app URL (Capacitor server, install links). */
  appUrl: read("VITE_APP_URL", "http://localhost:8080"),
  /** Production web app URL. */
  publicWebUrl: read("VITE_PUBLIC_WEB_URL", "https://front-end-friend-tool.lovable.app"),
  /** Capacitor WebView server URL. */
  capacitorServerUrl: read("CAPACITOR_SERVER_URL", read("VITE_PUBLIC_WEB_URL", "https://front-end-friend-tool.lovable.app")),
  /** Optional CDN/media base for resolving relative image paths. */
  mediaBaseUrl: read("VITE_MEDIA_BASE_URL", `http://${DEFAULT_VPS_HOST}/media`),
  /** Google Maps JavaScript API key. */
  googleMapsApiKey: read("VITE_GOOGLE_MAPS_API_KEY", read("VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY", "")),
  googleMapsTrackingId: read("VITE_GOOGLE_MAPS_TRACKING_ID", read("VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID", "")),
  /** Reverse geocode fallback (client-side). */
  geoReverseUrl: read("VITE_GEO_REVERSE_URL", "https://api.bigdatacloud.net/data/reverse-geocode-client"),
  /** Google Fonts stylesheet URL. */
  googleFontsUrl: read(
    "VITE_GOOGLE_FONTS_URL",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  ),
  googleFontsPreconnect: read("VITE_GOOGLE_FONTS_PRECONNECT", "https://fonts.googleapis.com"),
  googleFontsStaticPreconnect: read("VITE_GOOGLE_FONTS_STATIC_PRECONNECT", "https://fonts.gstatic.com"),
  /** Support contact. */
  supportPhone: read("VITE_SUPPORT_PHONE", "9390872628"),
  supportEmail: read("VITE_SUPPORT_EMAIL", "care@srimahalakshmistores.in"),
  whatsappBaseUrl: read("VITE_WHATSAPP_BASE_URL", "https://wa.me"),
  /** OTP timing (seconds). */
  otpTtlSeconds: Number(read("VITE_OTP_TTL_SECONDS", "300")),
  otpResendCooldown: Number(read("VITE_OTP_RESEND_COOLDOWN", "30")),
} as const;
