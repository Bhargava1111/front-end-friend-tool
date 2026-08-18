#!/usr/bin/env node
/**
 * Configure mobile dev for Windows Mobile Hotspot (192.168.137.1).
 * Use when home Wi‑Fi blocks phone → PC (ERR_ADDRESS_UNREACHABLE).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

console.log("");
console.log("Windows Mobile Hotspot setup");
console.log("==============================");
console.log("");
console.log("1. Settings → Network & Internet → Mobile hotspot → ON");
console.log("2. Connect your PHONE to this PC's hotspot Wi‑Fi");
console.log("3. Turn OFF mobile data on the phone");
console.log("");

const res = spawnSync("node", ["scripts/mobile-config.mjs"], {
  cwd: root,
  shell: isWin,
  stdio: "inherit",
  env: { ...process.env, MOBILE_HOST: "192.168.137.1" },
});

process.exit(res.status ?? 1);
