#!/usr/bin/env node
/**
 * Allow inbound TCP 8080 (Vite) and 8000 (Django) on Windows Firewall.
 * Run terminal as Administrator if rules fail to add.
 */
import { spawnSync } from "node:child_process";

const isWin = process.platform === "win32";
if (!isWin) {
  console.log("Firewall script is for Windows only. On Mac/Linux, allow ports 8080 and 8000 in your firewall.");
  process.exit(0);
}

const rules = [
  { name: "SriMahalakshmi Vite 8080", port: 8080 },
  { name: "SriMahalakshmi Django 8000", port: 8000 },
];

console.log("Adding Windows Firewall rules (may need Administrator)...\n");

let ok = true;
for (const { name, port } of rules) {
  const res = spawnSync(
    "netsh",
    [
      "advfirewall",
      "firewall",
      "add",
      "rule",
      `name=${name}`,
      "dir=in",
      "action=allow",
      "protocol=TCP",
      `localport=${port}`,
      "profile=any",
      "enable=yes",
    ],
    { encoding: "utf8", shell: true },
  );
  if (res.status === 0) {
    console.log(`✓ ${name}`);
  } else {
    ok = false;
    console.log(`✗ ${name} — run PowerShell as Administrator and retry: npm run mobile:firewall`);
    if (res.stderr) console.log(res.stderr.trim());
  }
}

console.log("");
if (ok) {
  console.log("Firewall rules added. Phones on your Wi‑Fi can reach ports 8080 and 8000.");
} else {
  console.log("Some rules failed. Right-click PowerShell → Run as administrator, then:");
  console.log("  cd", process.cwd());
  console.log("  npm run mobile:firewall");
}
console.log("");
