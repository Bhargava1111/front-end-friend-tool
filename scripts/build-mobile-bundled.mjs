#!/usr/bin/env node
/**
 * Copy built client assets into mobile/www for a bundled APK.
 * The native WebView boots as a SPA (no SSR payload) and calls the Django API directly.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    shell: isWin,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const cfg = JSON.parse(
  fs.readFileSync(path.join(root, "mobile", "capacitor.server.json"), "utf8"),
);

run("node", ["scripts/build-vps-frontend.mjs"], {
  VITE_API_URL: cfg.apiUrl,
  API_URL: cfg.apiUrl,
});

const publicDir = path.join(root, ".output", "public");
const wwwDir = path.join(root, "mobile", "www");
const serverDir = path.join(root, ".output", "server");
const manifestFiles = fs
  .readdirSync(serverDir)
  .filter((f) => f.startsWith("_tanstack-start-manifest_v-"));

if (manifestFiles.length === 0) {
  console.error("ERROR: TanStack manifest not found in .output/server");
  process.exit(1);
}

const manifestPath = path.join(serverDir, manifestFiles[0]);
const manifestSrc = fs.readFileSync(manifestPath, "utf8");
const scriptMatch = manifestSrc.match(/src:\s*"(\/assets\/[^"]+)"/);
const cssMatch = manifestSrc.match(/href:\s*"(\/assets\/[^"]+\.css)"/);

if (!scriptMatch) {
  console.error("ERROR: Could not find client entry script in TanStack manifest");
  process.exit(1);
}

const entryScript = scriptMatch[1];

fs.rmSync(wwwDir, { recursive: true, force: true });
fs.mkdirSync(wwwDir, { recursive: true });
copyDir(publicDir, wwwDir);

const cssFiles = fs.existsSync(path.join(wwwDir, "assets"))
  ? fs.readdirSync(path.join(wwwDir, "assets")).filter((name) => name.endsWith(".css"))
  : [];
const cssHref = cssMatch?.[1] || (cssFiles[0] ? `/assets/${cssFiles[0]}` : "");
const cssTag = cssHref ? `    <link rel="stylesheet" href=".${cssHref}" />\n` : "";
const bakedApiUrl = JSON.stringify(cfg.apiUrl || "");

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <title>Sri Mahalakshmi Stores</title>
    <style>html,body,#root{margin:0;min-height:100%;background:#2d5a45}</style>
${cssTag}    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      try {
        var apiUrl = ${bakedApiUrl};
        if (apiUrl) localStorage.setItem("mnxstore_native_api_url", apiUrl);
      } catch (e) {}
    </script>
    <script type="module" src=".${entryScript}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(wwwDir, "index.html"), indexHtml);

console.log("");
console.log("Bundled mobile web assets ready");
console.log(`  www:    ${wwwDir}`);
console.log(`  entry:  ${entryScript}`);
console.log(`  API:    ${cfg.apiUrl}`);
console.log("");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
