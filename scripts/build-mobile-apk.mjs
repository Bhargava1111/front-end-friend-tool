#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

const isProduction =
  process.argv.includes("--production") ||
  process.argv.includes("--prod") ||
  process.env.MOBILE_APK_MODE === "production";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: isWin, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("node", [isProduction ? "scripts/mobile-config-production.mjs" : "scripts/mobile-config.mjs"]);

const env = {
  ...process.env,
  CAPACITOR_SERVER_URL: JSON.parse(
    fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"),
  ).serverUrl,
};

run("npx", ["cap", "sync"], { env });

const gradle =
  process.env.GRADLE_HOME && fs.existsSync(path.join(process.env.GRADLE_HOME, "bin", isWin ? "gradle.bat" : "gradle"))
    ? path.join(process.env.GRADLE_HOME, "bin", isWin ? "gradle.bat" : "gradle")
    : fs.existsSync(path.join(root, ".gradle-cache", "gradle-8.14.3", "bin", "gradle.bat"))
      ? path.join(root, ".gradle-cache", "gradle-8.14.3", "bin", "gradle.bat")
      : isWin
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
const apkName = isProduction ? "SriMahalakshmiStores-production.apk" : "SriMahalakshmiStores-local.apk";
const apkDest = path.join(releasesDir, apkName);
fs.copyFileSync(apkSrc, apkDest);

const cfg = JSON.parse(fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"));
console.log("");
console.log(`APK ready: ${apkDest}`);
console.log(`Points to: ${cfg.serverUrl}`);
if (cfg.apiUrl) console.log(`API:       ${cfg.apiUrl}`);
console.log("");
if (isProduction) {
  console.log("Production APK — no PC servers needed. Uninstall old app, then install this APK.");
} else {
  console.log("Local dev APK — keep both servers running on your PC while testing:");
  console.log("  npm run backend:mobile");
  console.log("  npm run dev:mobile");
  console.log("");
  console.log("Phone must be on the same Wi‑Fi. Test in Chrome first: " + cfg.serverUrl);
}
console.log("");
