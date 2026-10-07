import type { Command } from "commander";
import chalk from "chalk";
import { TaskOrchestrator, type VerificationOutcome, type SddChangeProjection } from "@your-harness/application";
import { SpecificationStatus, WorkItemId } from "@your-harness/domain";
import { createLocalOperationalStore } from "../../persistence/index.js";
import { createProjectRuntimeEnvironment } from "../../runtime/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import { CliCommandError, CliExitCode, writeCliError } from "../presentation/cli-errors.js";

/** Consulta read-only que reúne estado local durable y la proyección SDD actual. */
export const registerOrchestrationCommands = (program: Command, { config, io }: CliContext): void => {
  const console = createCliConsole(io);
  const task = program.command("task").description("Consultar el progreso y el siguiente paso permitido de una tarea");
  task.command("plan <workItemId>")
    .description("Calcular un plan gobernado de solo lectura para un WorkItem")
    .option("-w, --workspace <path>", "Workspace del proyecto", process.cwd())
    .option("--json", "Imprimir el plan como JSON")
    .action(async (workItemId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const workItem = await store.workItems.findById(new WorkItemId(workItemId));
        if (!workItem) throw new CliCommandError(`No se encontró el WorkItem '${workItemId}'.`, "WORK_ITEM_NOT_FOUND", CliExitCode.NotFound);

        const binding = await store.executionBindings.findByWorkItemId(new WorkItemId(workItemId));
        let specification: Parameters<TaskOrchestrator["plan"]>[0]["specification"];
        let providerChange: SddChangeProjection | undefined;
        if (binding) {
          const environment = createProjectRuntimeEnvironment({ config, workspace: options.workspace });
          const project = await environment.sddProvider.readProject({ root: options.workspace });
          const source = project.specifications.find((item) => item.id === binding.specificationId);
          if (source) specification = {
            id: source.id,
            status: binding.specificationApproved ? SpecificationStatus.Approved : SpecificationStatus.Draft,
            approvedSnapshotDigest: binding.specificationSnapshotDigest,
            currentSnapshotDigest: source.contentDigest,
          };
          providerChange = binding.changeId ? project.changes.find((item) => item.id === binding.changeId) : undefined;
        }

        const traces = [...await store.executionTraces.findByWorkItemId(workItemId)].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        const trace = traces[0];
        let verification: { executionTraceId: string; outcome: VerificationOutcome } | undefined;
        if (trace) {
          const plans = await store.verificationPlans.findByExecutionTraceId(trace.id);
          const reports = (await Promise.all(plans.map((plan) => store.verificationReports.findByPlanId(plan.id)))).flat();
          const report = reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          if (report) verification = { executionTraceId: report.executionTraceId, outcome: report.outcome };
        }

        let change: Parameters<TaskOrchestrator["plan"]>[0]["change"];
        if (binding?.changeId && providerChange) {
          const handoff = await store.changeDraftHandoffs.findCurrentByChangeId(binding.changeId);
          const transition = await store.changeApplyTransitions.findCurrentByChangeId(binding.changeId);
          const approvals = await store.changeStageApprovals.findByChangeId(binding.changeId);
          const providerDriftedAfterMaterialization = transition?.toStatus === "materialized"
            && handoff !== undefined
            && providerChange.contentDigest !== handoff.proposedContentDigest;
          change = {
            id: binding.changeId,
            version: handoff?.proposedVersion ?? providerChange.version,
            digest: handoff?.proposedContentDigest ?? providerChange.contentDigest,
            approvals,
            approvedSnapshotDigest: binding.changeSnapshotDigest,
            currentSnapshotDigest: providerChange.contentDigest,
            providerTaskIds: providerChange.tasks.map((item) => item.id),
            selectedTaskIds: binding.taskIds,
            materialization: transition?.toStatus === "recovery-required" || providerDriftedAfterMaterialization
              ? "recovery-required"
              : transition?.toStatus === "materialized" ? "materialized" : "not-materialized",
          };
        }
        const plan = new TaskOrchestrator().plan({
          workItem: { id: workItem.id.value, status: workItem.status },
          ...(specification ? { specification } : {}),
          ...(change ? { change } : {}),
          ...(trace ? { execution: { traceId: trace.id, status: trace.runtimeResult.status } } : {}),
          ...(verification ? { verification } : {}),
        });
        if (options.json) console.log(JSON.stringify(plan, null, 2));
        else {
          console.log(chalk.cyan(`Plan de tarea: ${plan.workItemId}`));
          console.log(`Fase: ${plan.phase}`);
          if (plan.actions.length) console.log(`Siguiente acción: ${plan.actions.map((action) => action.kind).join(", ")}`);
          for (const blocker of plan.blockers) console.log(`Bloqueo (${blocker.code}): ${blocker.message}`);
          if (!plan.actions.length && !plan.blockers.length) console.log("No hay acciones pendientes.");
        }
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "TASK_PLAN_FAILED", title: chalk.red("✗ No se pudo calcular el plan:") });
      }
    });
};
