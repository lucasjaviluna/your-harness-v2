import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const repositoryRoot = process.cwd();
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "your-harness-packed-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
const externalWorkspace = path.join(temporaryRoot, "external-workspace");
mkdirSync(artifactDirectory);
mkdirSync(externalWorkspace);
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const runNpm = (args, cwd) => execFileSync(npmExecutable, args, {
  cwd,
  encoding: "utf8",
  stdio: "inherit",
  shell: process.platform === "win32",
});

try {
  runNpm(["pack", "--pack-destination", artifactDirectory], repositoryRoot);
  for (const workspace of ["shared", "domain", "application"]) {
    runNpm(["pack", "--ignore-scripts", "--pack-destination", artifactDirectory], path.join(repositoryRoot, "packages", workspace));
  }
  const tarballs = readdirSync(artifactDirectory).filter((entry) => entry.endsWith(".tgz"));
  if (tarballs.length !== 4) throw new Error(`Se esperaban cuatro tarballs y se encontraron ${tarballs.length}.`);

  writeFileSync(path.join(externalWorkspace, "package.json"), JSON.stringify({
    name: "your-harness-packed-install",
    private: true,
    version: "1.0.0",
  }, null, 2));
  runNpm(["install", "--no-audit", "--no-fund", ...tarballs.map((tarball) => path.join(artifactDirectory, tarball))], externalWorkspace);

  const cliEntryPoint = path.join(externalWorkspace, "node_modules", "your-harness", "dist", "src", "cli", "index.js");
  if (!existsSync(cliEntryPoint)) throw new Error(`No se encontró el entrypoint instalado: ${cliEntryPoint}`);
  const result = JSON.parse(execFileSync(process.execPath, [cliEntryPoint, "version", "--json"], {
    cwd: externalWorkspace,
    encoding: "utf8",
  }));
  if (result?.version !== "0.1.0" || typeof result?.node !== "string") {
    throw new Error("La respuesta de yh version no corresponde al paquete instalado.");
  }

  const securityWorkspace = path.join(temporaryRoot, "security-workspace");
  const changeDirectory = path.join(securityWorkspace, "openspec", "changes", "add-login");
  mkdirSync(changeDirectory, { recursive: true });
  mkdirSync(path.join(securityWorkspace, ".your-harness"));
  writeFileSync(path.join(securityWorkspace, ".your-harness", "config.yml"), [
    "runtime:",
    "  executionEnvironment:",
    "    workspace:",
    "      mode: read-only",
    "    capabilities: []",
    "",
  ].join("\n"));
  writeFileSync(path.join(changeDirectory, "proposal.md"), "# Existing proposal\n");
  writeFileSync(path.join(changeDirectory, "design.md"), "# Existing design\n");
  writeFileSync(path.join(changeDirectory, "tasks.md"), "- [ ] Existing task\n");
  const proposalPath = path.join(securityWorkspace, "proposal.md");
  const designPath = path.join(securityWorkspace, "design.md");
  const tasksPath = path.join(securityWorkspace, "tasks.md");
  writeFileSync(proposalPath, "# Add login\n");
  writeFileSync(designPath, "# Login design\n");
  writeFileSync(tasksPath, "- [ ] Implement login\n");

  const runYh = (args) => execFileSync(process.execPath, [cliEntryPoint, ...args], {
    cwd: securityWorkspace,
    encoding: "utf8",
  });
  runYh([
    "change", "propose", "add-login", "--workspace", securityWorkspace,
    "--proposal-file", proposalPath, "--design-file", designPath, "--tasks-file", tasksPath,
    "--by", "user@example.com", "--role", "reviewer", "--json",
  ]);
  for (const stage of ["proposal", "design", "task-plan", "apply-readiness"]) {
    runYh([
      "change", "approve", "add-login", "--workspace", securityWorkspace,
      "--stage", stage, "--decision", "approve", "--by", "architect@example.com",
      "--role", "reviewer", "--reason", `Aprobado: ${stage}`, "--json",
    ]);
  }
  try {
    runYh([
      "change", "apply", "add-login", "--workspace", securityWorkspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "packed-install-no-write", "--json",
    ]);
    throw new Error("El paquete instalado permitió materializar un Change sin workspace.write.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("permitió materializar")) throw error;
    const failure = error;
    if (failure?.status !== 3) throw error;
    const payload = JSON.parse(String(failure.stdout));
    if (payload?.error?.code !== "CHANGE_APPLY_GUARDRAIL" || payload?.error?.exitCode !== 3) {
      throw new Error("El paquete instalado no devolvió el guardrail esperado para change apply.");
    }
  }
  if (readFileSync(path.join(changeDirectory, "proposal.md"), "utf8") !== "# Existing proposal\n") {
    throw new Error("El paquete instalado modificó el Change pese a no tener workspace.write.");
  }
  console.log(`Instalación empaquetada verificada en ${externalWorkspace}`);
} catch (error) {
  console.error(`Falló la verificación de instalación empaquetada. Workspace: ${externalWorkspace}`);
  throw error;
} finally {
  if (process.env.YH_KEEP_PACKED_INSTALL !== "1") rmSync(temporaryRoot, { recursive: true, force: true });
}
