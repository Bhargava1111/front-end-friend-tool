// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import { loadEnv } from "vite";

const legacyCssTargets = browserslistToTargets(
  browserslist(["chrome >= 109", "firefox >= 128", "safari >= 15.4", "ios >= 15.4"]),
);

// Vite does not put .env* into process.env for config evaluation — load them explicitly.
const mode = process.env.NODE_ENV === "production" ? "production" : "development";
const fileEnv = loadEnv(mode, process.cwd(), "");
const mobileHttps = process.env.MOBILE_HTTPS === "1" || fileEnv.MOBILE_HTTPS === "1";
const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ||
  fileEnv.VITE_API_PROXY_TARGET ||
  "http://127.0.0.1:8000";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: mobileHttps ? [basicSsl()] : [],
    css: {
      lightningcss: {
        targets: legacyCssTargets,
      },
    },
    server: {
      ...(mobileHttps ? { https: true } : {}),
      // Proxy Django API in dev so browser + server functions can use /api/v1 on any host.
      proxy: {
        "/api/v1": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  },
});
