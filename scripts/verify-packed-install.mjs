import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  console.log(`Instalación empaquetada verificada en ${externalWorkspace}`);
} catch (error) {
  console.error(`Falló la verificación de instalación empaquetada. Workspace: ${externalWorkspace}`);
  throw error;
} finally {
  if (process.env.YH_KEEP_PACKED_INSTALL !== "1") rmSync(temporaryRoot, { recursive: true, force: true });
}
