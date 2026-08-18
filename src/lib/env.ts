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

export const env = {
  /** Browser/client API base (relative or absolute). */
  apiUrl: read("VITE_API_URL", "/api/v1"),
  /** Server-side API base for TanStack server functions. */
  serverApiUrl: read("API_URL", read("VITE_API_URL", "/api/v1")),
  /** Vite dev proxy target for /api/v1. */
  apiProxyTarget: read("VITE_API_PROXY_TARGET", "http://127.0.0.1:8000"),
  /** Public web app URL (Capacitor server, install links). */
  appUrl: read("VITE_APP_URL", "http://localhost:8080"),
  /** Production web app URL. */
  publicWebUrl: read("VITE_PUBLIC_WEB_URL", "https://front-end-friend-tool.lovable.app"),
  /** Capacitor WebView server URL. */
  capacitorServerUrl: read("CAPACITOR_SERVER_URL", read("VITE_PUBLIC_WEB_URL", "https://front-end-friend-tool.lovable.app")),
  /** Optional CDN/media base for resolving relative image paths. */
  mediaBaseUrl: read("VITE_MEDIA_BASE_URL", ""),
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
