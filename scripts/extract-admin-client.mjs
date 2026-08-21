import fs from "fs";
import path from "path";

const src = path.join(import.meta.dirname, "../src/lib");
const serverFiles = [
  "admin.functions.ts",
  "admin-extra.functions.ts",
  "admin-platform.functions.ts",
  "admin-ops.functions.ts",
];

const header = `import { apiFetch, toJsonBody } from "@/lib/api";
import { adminPanelHeaders } from "@/lib/admin-api";
import { adminClient, requireAccessToken } from "@/lib/admin-client";

/** Direct Django admin API — bundled Capacitor APK (no server functions). */

`;

const chunks = [];

for (const name of serverFiles) {
  const file = path.join(src, name);
  let content = fs.readFileSync(file, "utf8");
  const idx = content.search(/\n\/\*\* Direct Django API|export async function \w+Client\(/);
  if (idx === -1) continue;
  chunks.push(content.slice(idx).replace(/^\/\*\* Direct Django API[^\n]*\n/, ""));
  content = content.slice(0, idx).trimEnd() + "\n";

  content = content
    .replace(/\nimport \{ adminClient[^}]+} from "@\/lib\/admin-client";\n/, "\n")
    .replace(/\nimport \{ adminClient, requireAccessToken \} from "@\/lib\/admin-client";\n/, "\n");

  if (name === "admin-ops.functions.ts") {
    content = content.replace(/\nimport \{ adminClient \} from "@\/lib\/admin-client";\n/, "\n");
  }

  fs.writeFileSync(file, content);
  console.log("trimmed", name);
}

fs.writeFileSync(path.join(src, "admin-client.functions.ts"), header + chunks.join("\n"));
console.log("wrote admin-client.functions.ts");
