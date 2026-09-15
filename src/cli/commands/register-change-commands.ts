import type { Command } from "commander";
import chalk from "chalk";
import { findInvalidatedChangeStageApprovals } from "@your-harness/application";
import { createLocalOperationalStore } from "../../persistence/index.js";
import { createProjectRuntimeEnvironment } from "../../runtime/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

const readChange = async (workspace: string, changeId: string, config: CliContext["config"]) => {
  const environment = createProjectRuntimeEnvironment({ config, workspace });
  const project = await environment.sddProvider.readProject({ root: workspace });
  const change = project.changes.find((item) => item.id === changeId);
  if (!change) throw new Error(`No se encontró el Change '${changeId}' en el proveedor SDD.`);
  return { change, providerId: project.providerId };
};

/** Registra la fachada read-only de alto nivel para inspeccionar Changes. */
export const registerChangeCommands = (program: Command, { config, io }: CliContext): void => {
  const console = createCliConsole(io);
  const changeCommand = program.command("change").description("Inspeccionar el ciclo gobernado de Changes SDD");

  changeCommand.command("inspect <changeId>")
    .description("Mostrar el contenido proyectado, provenance y digest de un Change")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir la proyección como JSON")
    .action(async (changeId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const result = await readChange(options.workspace, changeId, config);
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        const { change } = result;
        console.log(chalk.cyan(`Change: ${change.id}`));
        console.log(`Título: ${change.title}`);
        console.log(`Proveedor: ${result.providerId}`);
        console.log(`Versión: ${change.version}`);
        console.log(`Estado SDD: ${change.status}`);
        console.log(`Digest: ${change.contentDigest}`);
        console.log(`Provenance: ${change.provenance.reference}`);
        console.log(`Tasks: ${change.tasks.length}`);
        console.log(`Artefactos: ${change.artifacts.length}`);
        if (change.rationale) console.log(`Rationale: ${change.rationale}`);
      } catch (error) {
        console.log(chalk.red("✗ No se pudo inspeccionar el Change:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  changeCommand.command("status <changeId>")
    .description("Mostrar estado SDD, lifecycle HITM y aprobaciones obsoletas")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el estado como JSON")
    .action(async (changeId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const { change, providerId } = await readChange(options.workspace, changeId, config);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const approvals = await store.changeStageApprovals.findByChangeId(changeId);
        const lifecycle = await store.governedChanges.findCurrentByChangeId(changeId);
        const invalidatedApprovals = findInvalidatedChangeStageApprovals({
          changeId,
          changeVersion: change.version,
          changeDigest: change.contentDigest,
          approvals,
        });
        const status = {
          change,
          providerId,
          lifecycle,
          approvals,
          invalidatedApprovals,
        };
        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }
        console.log(chalk.cyan(`Estado del Change: ${change.id}`));
        console.log(`SDD: ${change.status} | versión ${change.version} | digest ${change.contentDigest}`);
        console.log(`Lifecycle HITM: ${lifecycle?.status ?? "sin estado gobernado"}`);
        console.log(`Aprobaciones registradas: ${approvals.length}`);
        console.log(`Aprobaciones obsoletas: ${invalidatedApprovals.length}`);
        for (const invalidated of invalidatedApprovals) {
          console.log(chalk.yellow(`- ${invalidated.stage}: ${invalidated.reason} (${invalidated.approvalId})`));
        }
      } catch (error) {
        console.log(chalk.red("✗ No se pudo consultar el estado del Change:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });
};
