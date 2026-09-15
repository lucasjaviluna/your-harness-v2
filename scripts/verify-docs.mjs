import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "docs/05-reference/CLI.md",
  "docs/07-status/First-Release.md",
  "docs/07-status/Roadmap.md",
];

for (const relativePath of requiredFiles) await access(path.join(root, relativePath));

const cli = await readFile(path.join(root, "docs/05-reference/CLI.md"), "utf8");
for (const requiredText of ["CLI_USAGE_ERROR", "exitCode", "change apply", "--json"]) {
  if (!cli.includes(requiredText)) throw new Error(`Falta en CLI.md: ${requiredText}`);
}

console.log(`Documentación requerida verificada (${requiredFiles.length} archivos).`);
