#!/usr/bin/env node
/**
 * Transpile built CSS for Chrome 109 / older browsers.
 * Tailwind v4 emits oklch() and color-mix() which Chrome 109 cannot parse.
 * Lightning CSS adds hex/rgba fallbacks and @supports-wrapped modern rules.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const targets = browserslistToTargets(
  browserslist(["chrome >= 109", "firefox >= 128", "safari >= 15.4", "ios >= 15.4"]),
);

function walkCssFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCssFiles(fullPath, files);
    else if (entry.name.endsWith(".css")) files.push(fullPath);
  }
  return files;
}

function transpileFile(file) {
  const input = fs.readFileSync(file);
  if (!input.includes("oklch") && !input.includes("color-mix")) return false;

  const { code } = transform({
    filename: file,
    code: input,
    targets,
    minify: true,
  });

  fs.writeFileSync(file, code);
  return true;
}

const outputDirs = [path.join(root, ".output", "public"), path.join(root, ".output", "server")];
const cssFiles = outputDirs.flatMap((dir) => walkCssFiles(dir));
let updated = 0;

for (const file of cssFiles) {
  if (transpileFile(file)) updated += 1;
}

console.log(`Legacy CSS transpile: ${updated}/${cssFiles.length} file(s) updated for Chrome 109+`);
