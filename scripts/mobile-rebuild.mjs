#!/usr/bin/env node
/**
 * Full mobile refresh: fresh web build + cap sync + clean Android APK.
 * The APK loads your app from CAPACITOR_SERVER_URL (LAN dev server by default).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: isWin, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log("=== Mobile full rebuild ===\n");

run("node", ["scripts/mobile-config.mjs"]);
run("npm", ["run", "build"]);

const serverUrl = JSON.parse(
  fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"),
).serverUrl;

const env = { ...process.env, CAPACITOR_SERVER_URL: serverUrl };
run("npx", ["cap", "sync"], { env });

const gradle = fs.existsSync(path.join(root, "android", "gradlew.bat"))
  ? path.join(root, "android", "gradlew.bat")
  : path.join(root, "android", "gradlew");

const androidEnv = {
  ...env,
  ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.USERPROFILE || "", "android-sdk"),
  ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(process.env.USERPROFILE || "", "android-sdk"),
};

run(gradle, ["clean", "assembleDebug", "--no-daemon"], { cwd: path.join(root, "android"), env: androidEnv });

const apkSrc = path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const releasesDir = path.join(root, "mobile", "releases");
fs.mkdirSync(releasesDir, { recursive: true });
const apkDest = path.join(releasesDir, "SriMahalakshmiStores-debug.apk");
fs.copyFileSync(apkSrc, apkDest);

const cfg = JSON.parse(fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"));
const builtAt = new Date().toISOString();

console.log("");
console.log("=== Rebuild complete ===");
console.log(`APK:        ${apkDest}`);
console.log(`Built at:   ${builtAt}`);
console.log(`Loads from: ${cfg.serverUrl}`);
console.log("");
console.log("IMPORTANT — start these on your PC before opening the app on your phone:");
console.log("  npm run backend:mobile");
console.log("  npm run dev:mobile");
console.log("");
console.log("Then reinstall the APK and clear app storage if you still see old UI.");
