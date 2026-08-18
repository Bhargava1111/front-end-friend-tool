#!/usr/bin/env node
/**
 * Production mobile config — APK loads the deployed web app (no PC/LAN required).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.VITE_PUBLIC_WEB_URL?.trim() ||
  "https://front-end-friend-tool.lovable.app";

const mobileDir = path.join(root, "mobile");
fs.mkdirSync(mobileDir, { recursive: true });

const serverConfig = {
  mode: "production",
  serverUrl,
  apiUrl: "/api/v1",
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(mobileDir, "capacitor.server.json"), JSON.stringify(serverConfig, null, 2));

console.log("");
console.log("Production mobile config ready");
console.log("===============================");
console.log(`Web app URL:   ${serverUrl}`);
console.log("");
console.log("This APK works without your PC on the same Wi‑Fi.");
console.log("Next: npm run mobile:apk:prod");
console.log("");
