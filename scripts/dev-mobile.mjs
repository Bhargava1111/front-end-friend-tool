#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const isWin = process.platform === "win32";

spawnSync("node", ["scripts/mobile-config.mjs"], { stdio: "inherit", shell: isWin });

const result = spawnSync(
  "npx",
  ["vite", "dev", "--mode", "mobile", "--host", "0.0.0.0", "--port", "8080"],
  { stdio: "inherit", shell: isWin, env: { ...process.env } },
);

process.exit(result.status ?? 1);
