import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import chalk from "chalk";
import {
  ApproveChangeStageUseCase,
  CreateChangeDraftHandoffUseCase,
  MaterializeApprovedChangeUseCase,
  RecordChangeMaterializationAuditUseCase,
  TransitionChangeApplyUseCase,
  findInvalidatedChangeStageApprovals,
  type ChangeStage,
  type ChangeStageApprovalDecision,
  type ChangeStageApprovalRole,
} from "@your-harness/application";
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

  changeCommand.command("approve <changeId>")
    .description("Registrar una decisión HITM sobre una etapa del handoff vigente")
    .requiredOption("--stage <stage>", "proposal, design, task-plan, apply-readiness o verification-completion")
    .requiredOption("--decision <decision>", "approve, request-rework o reject")
    .requiredOption("-b, --by <actor>", "Usuario que toma la decisión")
    .requiredOption("--role <role>", "Rol HITM del usuario")
    .requiredOption("--reason <text>", "Motivo de la decisión")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir la aprobación como JSON")
    .action(async (changeId: string, options: {
      stage: ChangeStage; decision: ChangeStageApprovalDecision; by: string; role: ChangeStageApprovalRole;
      reason: string; workspace: string; json?: boolean;
    }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const handoff = await store.changeDraftHandoffs.findCurrentByChangeId(changeId);
        if (!handoff) throw new Error(`No existe un handoff para el Change '${changeId}'.`);
        if (!["proposal", "design", "task-plan", "apply-readiness", "verification-completion"].includes(options.stage)) {
          throw new Error(`Etapa inválida: '${options.stage}'.`);
        }
        if (!["approve", "request-rework", "reject"].includes(options.decision)) {
          throw new Error(`Decisión inválida: '${options.decision}'.`);
        }
        if (!["engineer", "reviewer", "maintainer", "owner"].includes(options.role)) {
          throw new Error(`Rol inválido: '${options.role}'.`);
        }
        const approval = await new ApproveChangeStageUseCase(store.changeStageApprovals).execute({
          id: randomUUID(),
          changeId,
          stage: options.stage,
          changeVersion: handoff.proposedVersion,
          changeDigest: handoff.proposedContentDigest,
          decision: options.decision,
          approvedBy: options.by,
          approvedByRole: options.role,
          reason: options.reason,
          approvedAt: new Date().toISOString(),
        });
        if (options.json) {
          console.log(JSON.stringify(approval, null, 2));
          return;
        }
        console.log(chalk.green(`✓ Decisión '${approval.decision}' registrada para ${approval.stage}`));
        console.log(`Change: ${changeId} | Handoff: ${handoff.id}`);
        console.log(`Versión: ${approval.changeVersion} | Digest: ${approval.changeDigest}`);
      } catch (error) {
        console.log(chalk.red("✗ No se pudo registrar la decisión HITM:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  changeCommand.command("apply <changeId>")
    .description("Materializar el handoff vigente después de Apply Readiness aprobada")
    .requiredOption("--confirm", "Confirmación HITM explícita para escribir OpenSpec")
    .requiredOption("-b, --by <actor>", "Usuario que ejecuta la materialización")
    .requiredOption("--role <role>", "Rol del usuario que ejecuta la materialización")
    .option("--idempotency-key <key>", "Clave estable para no repetir la misma solicitud lógica")
    .option("--retry-of <attemptId>", "Intento anterior que se desea reejecutar con una nueva clave")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el resultado de materialización como JSON")
    .action(async (changeId: string, options: { confirm?: boolean; by: string; role: string; workspace: string; idempotencyKey?: string; retryOf?: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const handoff = await store.changeDraftHandoffs.findCurrentByChangeId(changeId);
        if (!handoff) throw new Error(`No existe un handoff para el Change '${changeId}'.`);
        const idempotencyKey = options.idempotencyKey ?? `${handoff.id}:${handoff.proposedContentDigest}:${options.by}`;
        const existingAudit = await store.changeMaterializationAudits.findByIdempotencyKey(idempotencyKey);
        if (existingAudit) {
          if (existingAudit.handoffId !== handoff.id || existingAudit.changeId !== changeId) {
            throw new Error(`La idempotencyKey '${idempotencyKey}' ya fue usada para otra materialización.`);
          }
          if (options.json) {
            console.log(JSON.stringify({ handoffId: handoff.id, idempotentReplay: true, audit: existingAudit }, null, 2));
          } else {
            console.log(chalk.yellow(`↺ Solicitud ya procesada: ${existingAudit.outcome}`));
            console.log(`Intento: ${existingAudit.attemptId}`);
            console.log(`Auditoría: ${existingAudit.id}`);
          }
          return;
        }
        const attemptId = randomUUID();
        const transition = new TransitionChangeApplyUseCase(store.changeApplyTransitions);
        const transitionInput = {
          changeId, handoffId: handoff.id, attemptId, idempotencyKey,
          changeVersion: handoff.proposedVersion, changeDigest: handoff.proposedContentDigest,
          provenance: handoff.provenance, changedBy: options.by, changedByRole: options.role,
        };
        const currentApply = await store.changeApplyTransitions.findCurrentByChangeId(changeId);
        if (!currentApply) {
          await transition.execute({ ...transitionInput, id: randomUUID(), requestedStatus: "approved", reason: "Apply Readiness aprobada.", changedAt: new Date().toISOString() });
          await transition.execute({ ...transitionInput, id: randomUUID(), requestedStatus: "apply-ready", reason: "Solicitud lista para materializar.", changedAt: new Date().toISOString() });
        } else if (currentApply.toStatus === "apply-failed") {
          if (options.retryOf !== currentApply.attemptId) {
            throw new Error(`El retry debe indicar --retry-of ${currentApply.attemptId}.`);
          }
        } else if (currentApply.toStatus === "materialized") {
          throw new Error(`El Change '${changeId}' ya está materializado.`);
        } else {
          throw new Error(`El Change '${changeId}' tiene una operación Apply en estado '${currentApply.toStatus}'.`);
        }
        await transition.execute({ ...transitionInput, id: randomUUID(), requestedStatus: "applying", reason: options.retryOf ? `Retry de ${options.retryOf}.` : "Inicio de materialización.", changedAt: new Date().toISOString() });
        const environment = createProjectRuntimeEnvironment({
          config,
          workspace: options.workspace,
          sddMaterializerConfirmed: options.confirm === true,
        });
        const preview = {
          scope: { root: options.workspace },
          changeId: handoff.changeId,
          baseVersion: handoff.baseVersion,
          baseContentDigest: handoff.baseContentDigest,
          proposal: handoff.proposal,
          design: handoff.design,
          tasks: handoff.tasks,
          version: handoff.proposedVersion,
          contentDigest: handoff.proposedContentDigest,
        };
        const approvals = await store.changeStageApprovals.findByChangeId(changeId);
        let result;
        try {
          result = await new MaterializeApprovedChangeUseCase(environment.sddMaterializer).execute(preview, approvals);
        } catch (error) {
          await new RecordChangeMaterializationAuditUseCase(store.changeMaterializationAudits).execute({
            id: randomUUID(), attemptId, idempotencyKey, retryOfAttemptId: options.retryOf, handoffId: handoff.id, changeId, providerId: handoff.providerId,
            provenance: handoff.provenance, strategy: environment.sddMaterializerMode ?? "filesystem",
            baseVersion: handoff.baseVersion, baseContentDigest: handoff.baseContentDigest,
            materializedVersion: handoff.proposedVersion, materializedContentDigest: handoff.proposedContentDigest,
            outcome: "failed", actor: options.by, actorRole: options.role,
            error: error instanceof Error ? error.message : String(error), occurredAt: new Date().toISOString(),
          }).catch(() => undefined);
          await transition.execute({ ...transitionInput, id: randomUUID(), requestedStatus: "apply-failed", reason: "La materialización falló.", changedAt: new Date().toISOString() }).catch(() => undefined);
          throw error;
        }
        const audit = await new RecordChangeMaterializationAuditUseCase(store.changeMaterializationAudits).execute({
          id: randomUUID(), attemptId, idempotencyKey, retryOfAttemptId: options.retryOf, handoffId: handoff.id, changeId, providerId: handoff.providerId,
          provenance: handoff.provenance, strategy: environment.sddMaterializerMode ?? "filesystem",
          baseVersion: handoff.baseVersion, baseContentDigest: handoff.baseContentDigest,
          materializedVersion: result.version, materializedContentDigest: result.contentDigest,
          outcome: "succeeded", actor: options.by, actorRole: options.role, occurredAt: new Date().toISOString(),
        });
        await transition.execute({ ...transitionInput, id: randomUUID(), requestedStatus: "materialized", reason: "La materialización finalizó correctamente.", changedAt: new Date().toISOString() });
        if (options.json) {
          console.log(JSON.stringify({ handoffId: handoff.id, result, audit }, null, 2));
          return;
        }
        console.log(chalk.green(`✓ Change '${changeId}' materializado`));
        console.log(`Handoff: ${handoff.id}`);
        console.log(`Versión: ${result.version}`);
        console.log(`Digest: ${result.contentDigest}`);
        console.log(`Auditoría: ${audit.id}`);
      } catch (error) {
        console.log(chalk.red("✗ No se pudo aplicar el Change:"));
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
    .description("Mostrar estado SDD, lifecycle HITM, Apply y aprobaciones obsoletas")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el estado como JSON")
    .action(async (changeId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const { change, providerId } = await readChange(options.workspace, changeId, config);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const approvals = await store.changeStageApprovals.findByChangeId(changeId);
        const lifecycle = await store.governedChanges.findCurrentByChangeId(changeId);
        const applyTransitions = await store.changeApplyTransitions.findByChangeId(changeId);
        const materialization = await store.changeMaterializationAudits.findCurrentByChangeId(changeId);
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
          applyTransitions,
          applyStatus: applyTransitions.at(-1)?.toStatus,
          materialization,
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
        console.log(`Estado Apply: ${applyTransitions.at(-1)?.toStatus ?? "sin estado"}`);
        console.log(`Transiciones Apply: ${applyTransitions.length}`);
        if (materialization) console.log(`Última materialización: ${materialization.outcome} (${materialization.occurredAt})`);
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
