#!/usr/bin/env node
/**
 * Production mobile config — bundled UI in the APK, Django API on the VPS only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const vpsIp = process.env.VPS_IP?.trim() || "200.234.39.88";
const vpsScheme = process.env.VPS_SCHEME?.trim() || "http";
const vpsBase = `${vpsScheme}://${vpsIp}`;
const vpsApiUrl = process.env.VPS_API_URL?.trim() || `${vpsBase}/api/v1`;

const mobileDir = path.join(root, "mobile");
fs.mkdirSync(mobileDir, { recursive: true });

const serverConfig = {
  mode: "production",
  bundled: true,
  serverUrl: "",
  webUrl: vpsBase,
  apiUrl: vpsApiUrl,
  vpsIp,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(mobileDir, "capacitor.server.json"), JSON.stringify(serverConfig, null, 2));

const envLines = [
  `# Auto-generated production config — VPS API only`,
  `VITE_API_URL=${vpsApiUrl}`,
  `API_URL=${vpsApiUrl}`,
  `VITE_PUBLIC_WEB_URL=${vpsBase}`,
  `VITE_APP_URL=${vpsBase}`,
  `# CAPACITOR_SERVER_URL not set — UI bundled in APK`,
  ``,
];
fs.writeFileSync(path.join(root, ".env.mobile.local"), envLines.join("\n"));

console.log("");
console.log("Production mobile config ready");
console.log("===============================");
console.log(`UI:            bundled in APK`);
console.log(`Backend API:   ${vpsApiUrl}`);
console.log("");
console.log("Next: npm run mobile:apk:prod");
console.log("");
