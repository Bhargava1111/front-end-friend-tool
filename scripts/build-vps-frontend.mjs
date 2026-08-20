#!/usr/bin/env node
/**
 * Build the TanStack Start frontend for VPS (Node/Nitro server).
 * Output: .output/  (run with: node .output/server/index.mjs)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

const vpsIp = process.env.VPS_IP?.trim() || "200.234.39.88";
const vpsScheme = process.env.VPS_SCHEME?.trim() || "http";
const publicUrl = process.env.VITE_PUBLIC_WEB_URL?.trim() || `${vpsScheme}://${vpsIp}`;
const apiUrl = process.env.VITE_API_URL?.trim() || `${publicUrl}/api/v1`;

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    shell: isWin,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log("Building VPS web frontend...");
console.log(`  PUBLIC: ${publicUrl}`);
console.log(`  API:    ${apiUrl}`);

run("npm", ["run", "build"], {
  NITRO_PRESET: "node-server",
  VITE_API_URL: apiUrl,
  API_URL: apiUrl,
  VITE_PUBLIC_WEB_URL: publicUrl,
  VITE_APP_URL: publicUrl,
  ...(process.env.TSS_SERVER_FN_BASE ? { TSS_SERVER_FN_BASE: process.env.TSS_SERVER_FN_BASE } : {}),
});

const nitroJson = path.join(root, ".output", "nitro.json");
if (!fs.existsSync(nitroJson)) {
  console.error("ERROR: .output/nitro.json missing — build failed?");
  process.exit(1);
}

const preset = JSON.parse(fs.readFileSync(nitroJson, "utf8")).preset;
console.log("");
console.log(`VPS frontend build OK (preset: ${preset})`);
console.log(`  Preview: node .output/server/index.mjs`);
console.log("");
