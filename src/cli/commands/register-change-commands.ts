import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import chalk from "chalk";
import { CreateChangeDraftHandoffUseCase, findInvalidatedChangeStageApprovals } from "@your-harness/application";
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

  changeCommand.command("propose <changeId>")
    .description("Crear un snapshot durable para revisión humana sin modificar OpenSpec")
    .requiredOption("--proposal-file <path>", "Archivo markdown de Proposal")
    .requiredOption("--design-file <path>", "Archivo markdown de Design")
    .requiredOption("--tasks-file <path>", "Archivo markdown de Tasks")
    .requiredOption("-b, --by <actor>", "Actor que crea el handoff")
    .requiredOption("--role <role>", "Rol del actor que crea el handoff")
    .option("--origin <origin>", "Origen del snapshot: agent o user", "user")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el handoff como JSON")
    .action(async (changeId: string, options: {
      proposalFile: string; designFile: string; tasksFile: string; by: string; role: string;
      origin: "agent" | "user"; workspace: string; json?: boolean;
    }) => {
      try {
        if (options.origin !== "agent" && options.origin !== "user") throw new Error("--origin debe ser 'agent' o 'user'.");
        const [proposal, design, tasks] = await Promise.all([
          readFile(path.resolve(options.proposalFile), "utf8"),
          readFile(path.resolve(options.designFile), "utf8"),
          readFile(path.resolve(options.tasksFile), "utf8"),
        ]);
        const environment = createProjectRuntimeEnvironment({ config, workspace: options.workspace });
        const project = await environment.sddProvider.readProject({ root: options.workspace });
        const currentChange = project.changes.find((item) => item.id === changeId);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const currentHandoff = await store.changeDraftHandoffs.findCurrentByChangeId(changeId);
        const preview = await environment.sddMaterializer.previewDraftChange({
          scope: { root: options.workspace },
          changeId,
          baseVersion: currentChange?.version,
          baseContentDigest: currentChange?.contentDigest,
          proposal,
          design,
          tasks,
        });
        const handoff = await new CreateChangeDraftHandoffUseCase(store.changeDraftHandoffs).execute({
          id: randomUUID(),
          changeId,
          providerId: project.providerId,
          provenance: currentChange?.provenance ?? { providerId: project.providerId, reference: `openspec/changes/${changeId}` },
          origin: options.origin,
          baseVersion: preview.baseVersion,
          baseContentDigest: preview.baseContentDigest,
          proposedVersion: preview.version,
          proposedContentDigest: preview.contentDigest,
          proposal: preview.proposal,
          design: preview.design,
          tasks: preview.tasks,
          createdBy: options.by,
          createdByRole: options.role,
          createdAt: new Date().toISOString(),
          supersedesHandoffId: currentHandoff?.id,
        });
        if (options.json) {
          console.log(JSON.stringify(handoff, null, 2));
          return;
        }
        console.log(chalk.green(`✓ Handoff '${handoff.id}' listo para revisión`));
        console.log(`Change: ${handoff.changeId}`);
        console.log(`Versión propuesta: ${handoff.proposedVersion}`);
        console.log(`Digest: ${handoff.proposedContentDigest}`);
        console.log("Siguiente paso: yh change review " + changeId);
      } catch (error) {
        console.log(chalk.red("✗ No se pudo crear el handoff del Change:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  changeCommand.command("review <changeId>")
    .description("Mostrar el snapshot Proposal/Design/Tasks pendiente de revisión HITM")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el handoff como JSON")
    .action(async (changeId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const handoff = await store.changeDraftHandoffs.findCurrentByChangeId(changeId);
        if (!handoff) throw new Error(`No existe un handoff para el Change '${changeId}'.`);
        if (options.json) {
          console.log(JSON.stringify(handoff, null, 2));
          return;
        }
        console.log(chalk.cyan(`Revisión del handoff: ${handoff.id}`));
        console.log(`Change: ${handoff.changeId}`);
        console.log(`Estado: ${handoff.status}`);
        console.log(`Versión: ${handoff.proposedVersion}`);
        console.log(`Digest: ${handoff.proposedContentDigest}`);
        console.log(`Creado por: ${handoff.createdBy} (${handoff.createdByRole})`);
        console.log("\n--- Proposal ---\n" + handoff.proposal);
        console.log("\n--- Design ---\n" + handoff.design);
        console.log("\n--- Tasks ---\n" + handoff.tasks);
      } catch (error) {
        console.log(chalk.red("✗ No se pudo cargar la revisión del Change:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

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
