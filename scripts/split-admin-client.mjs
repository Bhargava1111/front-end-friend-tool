import fs from "fs";
import path from "path";

const src = path.join(import.meta.dirname, "../src");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const clientRe = /\b(\w+Client)\b/g;
const files = walk(path.join(src, "routes/admin")).concat(
  path.join(src, "components/admin-banner-form.tsx"),
  path.join(src, "routes/admin/route.tsx"),
  path.join(src, "components/admin-otp-gate.tsx"),
);

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("Client")) continue;

  const clients = [...content.matchAll(/\b([a-zA-Z]+Client)\b/g)].map((m) => m[1]);
  const uniqueClients = [...new Set(clients)].filter((c) => c.endsWith("Client"));
  if (uniqueClients.length === 0) continue;

  for (const mod of [
    "@/lib/admin.functions",
    "@/lib/admin-extra.functions",
    "@/lib/admin-platform.functions",
    "@/lib/admin-ops.functions",
  ]) {
    const importRe = new RegExp(`import \\{([^}]+)\\} from "${mod.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}";`);
    const m = content.match(importRe);
    if (!m) continue;
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const kept = names.filter((n) => !n.endsWith("Client"));
    const removedClients = names.filter((n) => n.endsWith("Client"));
    if (removedClients.length === 0) continue;
    if (kept.length === 0) {
      content = content.replace(importRe, "");
    } else {
      content = content.replace(importRe, `import { ${kept.join(", ")} } from "${mod}";`);
    }
  }

  const usedClients = uniqueClients.filter((c) => content.includes(c));
  if (usedClients.length > 0) {
    const clientImportRe = /import \{([^}]+)\} from "@\/lib\/admin-client\.functions";/;
    const existing = content.match(clientImportRe);
    if (existing) {
      const names = existing[1].split(",").map((s) => s.trim()).filter(Boolean);
      const merged = [...new Set([...names, ...usedClients])];
      content = content.replace(clientImportRe, `import { ${merged.join(", ")} } from "@/lib/admin-client.functions";`);
    } else {
      const insert = `import { ${usedClients.join(", ")} } from "@/lib/admin-client.functions";\n`;
      const hookIdx = content.indexOf("import { useAdminFn }");
      if (hookIdx !== -1) {
        const lineEnd = content.indexOf("\n", hookIdx) + 1;
        content = content.slice(0, lineEnd) + insert + content.slice(lineEnd);
      } else {
        const firstImportEnd = content.indexOf("\n", content.indexOf("import ")) + 1;
        content = content.slice(0, firstImportEnd) + insert + content.slice(firstImportEnd);
      }
    }
  }

  fs.writeFileSync(file, content);
  console.log("fixed imports", path.relative(src, file));
}
