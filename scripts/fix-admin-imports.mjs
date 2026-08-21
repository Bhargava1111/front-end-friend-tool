import fs from "fs";
import path from "path";

const root = path.join(import.meta.dirname, "../src");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

for (const file of walk(path.join(root, "routes/admin"))) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("admin-client.functions")) continue;

  content = content.replace(
    /import \{ useQueryClient, ([^}]+) \} from "@\/lib\/admin-client\.functions";/g,
    "import { $1 } from \"@/lib/admin-client.functions\";",
  );
  content = content.replace(/, queryClient/g, "");

  fs.writeFileSync(file, content);
  console.log("fixed", path.relative(root, file));
}
