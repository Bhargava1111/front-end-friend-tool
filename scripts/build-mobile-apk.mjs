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

const isVps =
  process.argv.includes("--vps") ||
  process.env.MOBILE_APK_MODE === "vps";

const isBundled = process.argv.includes("--bundled") || process.env.MOBILE_BUNDLED === "1";

if (isBundled) process.env.MOBILE_BUNDLED = "1";

function runConfig() {
  if (isVps) return "scripts/mobile-config-vps.mjs";
  if (isProduction) return "scripts/mobile-config-production.mjs";
  return "scripts/mobile-config.mjs";
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: isWin, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("node", [runConfig()]);

const serverCfg = JSON.parse(
  fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"),
);

// Bundle UI inside APK (no Lovable, no remote web URL).
if (isBundled || serverCfg.bundled) {
  run("node", ["scripts/build-mobile-bundled.mjs"]);
}

const env = {
  ...process.env,
  ...(serverCfg.serverUrl ? { CAPACITOR_SERVER_URL: serverCfg.serverUrl } : {}),
};

run("npx", ["cap", "sync"], { env });

// Embed VPS/local API config for native WebView injection (MainActivity.java).
const serverConfigPath = path.join(root, "mobile", "capacitor.server.json");
if (fs.existsSync(serverConfigPath)) {
  fs.copyFileSync(
    serverConfigPath,
    path.join(root, "android", "app", "src", "main", "assets", "mobile-server-config.json"),
  );
}

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
const apkName = isVps
  ? "SriMahalakshmiStores-vps.apk"
  : isProduction
    ? "SriMahalakshmiStores-production.apk"
    : "SriMahalakshmiStores-local.apk";
const apkDest = path.join(releasesDir, apkName);
fs.copyFileSync(apkSrc, apkDest);

const cfg = JSON.parse(fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"));
console.log("");
console.log(`APK ready: ${apkDest}`);
if (cfg.serverUrl) console.log(`Web UI:    ${cfg.serverUrl}`);
else if (cfg.bundled) console.log(`Web UI:    bundled in APK`);
if (cfg.apiUrl) console.log(`API:       ${cfg.apiUrl}`);
console.log("");
if (isVps) {
  console.log("VPS APK — no Lovable.");
  if (cfg.bundled) {
    console.log("Bundled UI in APK; server functions + API on VPS: " + cfg.webUrl);
    console.log("Deploy VPS frontend first: bash backend/deploy/vps/install.sh");
  } else {
    console.log("Loads full UI from VPS: " + cfg.webUrl);
    console.log("Deploy VPS frontend first if you see a blank screen.");
  }
  console.log("Uninstall old app, then install this APK.");
} else if (isProduction) {
  console.log("Production APK — UI bundled, backend is the VPS only (no PC, no Lovable).");
  console.log("API: " + (cfg.apiUrl || cfg.webUrl));
  console.log("Uninstall old app, then install this APK.");
  console.log("The VPS must serve HTTP on port 80: " + (cfg.webUrl || cfg.apiUrl));
} else {
  console.log("Local APK — keep Django running on your PC:");
  console.log("  npm run backend:db");
  console.log("  npm run backend:mobile");
  console.log("");
  if (cfg.bundled) {
    console.log("UI is bundled. Phone must reach API: " + cfg.apiUrl);
  } else {
    console.log("Phone must be on the same Wi‑Fi. Test in Chrome first: " + cfg.serverUrl);
  }
}
console.log("");
