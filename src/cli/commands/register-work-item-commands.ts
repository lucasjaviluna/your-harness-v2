import { randomUUID } from "node:crypto";
import type { Command } from "commander";
import chalk from "chalk";
import { CompleteWorkItemUseCase, createExecutionScopeSelection, ExecuteStoredWorkItemUseCase, InMemoryRepository, type ExecutionScopeSelectionRole } from "@your-harness/application";
import { IntentId, Specification, SpecificationId, WorkItem, WorkItemId, WorkItemTitle } from "@your-harness/domain";
import { createLocalOperationalStore } from "../../persistence/index.js";
import { createProjectRuntimeEnvironment } from "../../runtime/index.js";
import { assertSpecificationSnapshotMatchesBinding, resolveExecutionSource } from "../../sdd/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import { CliCommandError, CliExitCode, writeCliError } from "../presentation/cli-errors.js";

type CompletionDecision = "authorize-completion" | "request-rework" | "require-further-review";

/** Registra el flujo operacional durable de WorkItems. */
export const registerWorkItemCommands = (program: Command, { config, io }: CliContext): void => {
  const console = createCliConsole(io);
  const workItemCommand = program.command("work-item").alias("work").description("Execute engineering work items");

  workItemCommand.command("create <workItemId>").description("Create a persistent WorkItem")
    .requiredOption("-t, --title <text>", "Work item objective")
    .option("-i, --intent <id>", "Intent identifier", "default-intent")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir WorkItem como JSON")
    .action(async (workItemId: string, options: { title: string; intent: string; workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        if (await store.workItems.findById(id)) throw new CliCommandError(`Work item '${workItemId}' already exists.`, "WORK_ITEM_ALREADY_EXISTS", CliExitCode.Conflict);
        await store.workItems.save(new WorkItem(id, new IntentId(options.intent), new WorkItemTitle(options.title)));
        if (options.json) console.log(JSON.stringify({ workItemId, status: "created" }, null, 2));
        else console.log(chalk.green(`✓ Work item '${workItemId}' persisted`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_CREATE_FAILED", title: chalk.red("✗ Work item creation failed:") });
      }
    });

  workItemCommand.command("bind <workItemId>").description("Bind a WorkItem to the configured SDD source")
    .requiredOption("-s, --specification <id>", "SDD specification identifier")
    .requiredOption("--approve-specification", "Explicitly authorize this SDD projection for execution")
    .option("-c, --change <id>", "SDD Change identifier")
    .option("-t, --task <id>", "SDD Change task identifier", (value, previous: string[] = []) => [...previous, value])
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir el binding como JSON")
    .action(async (workItemId: string, options: { specification: string; approveSpecification: boolean; change?: string; task?: string[]; workspace: string; json?: boolean }) => {
      try {
        const projectEnvironment = createProjectRuntimeEnvironment({ config, workspace: options.workspace });
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        if (!(await store.workItems.findById(id))) throw new CliCommandError(`Work item '${workItemId}' was not found in local operational state.`, "WORK_ITEM_NOT_FOUND", CliExitCode.NotFound);
        const sddProject = await projectEnvironment.sddProvider.readProject({ root: options.workspace });
        const source = resolveExecutionSource(sddProject, {
          workItemId,
          specificationId: options.specification,
          specificationApproved: options.approveSpecification,
          changeId: options.change,
          taskIds: options.task ?? [],
        });
        await store.executionBindings.save({
          workItemId,
          specificationId: options.specification,
          specificationApproved: options.approveSpecification,
          specificationSnapshotDigest: source.specificationSnapshot.contentDigest,
          changeId: options.change,
          taskIds: options.task ?? [],
        });
        if (options.json) console.log(JSON.stringify({ workItemId, specificationId: options.specification, changeId: options.change, taskIds: options.task ?? [] }, null, 2));
        else console.log(chalk.green(`✓ Work item '${workItemId}' bound to SDD specification '${options.specification}'`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_BIND_FAILED", title: chalk.red("✗ Work item binding failed:") });
      }
    });

  workItemCommand.command("start <workItemId>").description("Start a persisted WorkItem")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir WorkItem como JSON")
    .action(async (workItemId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        const workItem = await store.workItems.findById(id);
        if (!workItem) throw new CliCommandError(`Work item '${workItemId}' not found.`, "WORK_ITEM_NOT_FOUND", CliExitCode.NotFound);
        await store.workItems.save(workItem.start());
        if (options.json) console.log(JSON.stringify({ workItemId, status: "in-progress" }, null, 2));
        else console.log(chalk.green(`✓ Work item '${workItemId}' started`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_START_FAILED", title: chalk.red("✗ Work item start failed:") });
      }
    });

  workItemCommand.command("select <workItemId>").description("Confirmar el alcance de Requirements y Scenarios para ejecución")
    .requiredOption("-r, --requirement <id>", "Requirement seleccionado", (value, previous: string[] = []) => [...previous, value])
    .option("-s, --scenario <id>", "Scenario seleccionado", (value, previous: string[] = []) => [...previous, value])
    .requiredOption("-b, --by <actor>", "Actor que confirma el alcance")
    .requiredOption("--role <role>", "Rol HITM: reviewer, maintainer u owner")
    .requiredOption("--reason <text>", "Motivo de la confirmación")
    .option("-w, --workspace <path>", "Ubicación del estado del workspace", process.cwd())
    .option("--json", "Imprimir la selección como JSON")
    .action(async (workItemId: string, options: { requirement?: string[]; scenario?: string[]; by: string; role: ExecutionScopeSelectionRole; reason: string; workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const binding = await store.executionBindings.findByWorkItemId(new WorkItemId(workItemId));
        if (!binding) throw new CliCommandError(`WorkItem '${workItemId}' no tiene un binding SDD.`, "WORK_ITEM_BINDING_NOT_FOUND", CliExitCode.NotFound);
        const environment = createProjectRuntimeEnvironment({ config, workspace: options.workspace });
        const source = resolveExecutionSource(await environment.sddProvider.readProject({ root: options.workspace }), binding);
        const requirementIds = options.requirement ?? [];
        const scenarioIds = options.scenario ?? [];
        const requirements = new Set(source.specification.requirements.map((item) => item.id.value));
        if (requirementIds.some((id) => !requirements.has(id))) throw new Error("La selección contiene un Requirement que no pertenece a la Specification.");
        const scenarios = new Set(source.specification.requirements.flatMap((item) => item.scenarios.map((scenario) => scenario.id.value)));
        if (scenarioIds.some((id) => !scenarios.has(id))) throw new Error("La selección contiene un Scenario que no pertenece a la Specification.");
        const selectedScenarioIds = new Set(source.specification.requirements
          .filter((item) => requirementIds.includes(item.id.value))
          .flatMap((item) => item.scenarios.map((scenario) => scenario.id.value)));
        if (scenarioIds.some((id) => !selectedScenarioIds.has(id))) throw new Error("Cada Scenario seleccionado debe pertenecer a un Requirement seleccionado.");
        await store.executionScopeSelections.save(createExecutionScopeSelection({
          id: randomUUID(), workItemId, specificationId: source.specification.id.value,
          specificationSnapshotDigest: source.specificationSnapshot.contentDigest,
          requirementIds, scenarioIds, confirmedBy: options.by, confirmedByRole: options.role,
          reason: options.reason, confirmedAt: new Date().toISOString(),
        }));
        if (options.json) console.log(JSON.stringify({ workItemId, requirementIds, scenarioIds, confirmedBy: options.by, confirmedByRole: options.role }, null, 2));
        else console.log(chalk.green(`✓ Alcance confirmado para '${workItemId}' por '${options.by}' (${options.role})`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_SCOPE_FAILED", title: chalk.red("✗ Confirmación de alcance fallida:") });
      }
    });

  workItemCommand.command("authorize <workItemId>").description("Apply an explicit verification decision to a persisted WorkItem")
    .requiredOption("-r, --report <id>", "VerificationReport identifier")
    .requiredOption("-d, --decision <decision>", "authorize-completion, request-rework or require-further-review")
    .requiredOption("-b, --by <actor>", "Authorizing actor")
    .requiredOption("--role <role>", "Actor role: engineer, reviewer, maintainer or owner")
    .requiredOption("--reason <text>", "Reason for the decision")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir la autorización como JSON")
    .action(async (workItemId: string, options: { report: string; decision: CompletionDecision; by: string; role: "engineer" | "reviewer" | "maintainer" | "owner"; reason: string; workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const report = await store.verificationReports.findById(options.report);
        await new CompleteWorkItemUseCase(store.workItems, store.executionTraces, store.verificationReports, store.completionAuthorizations)
          .execute({
            workItemId: new WorkItemId(workItemId),
            authorization: {
              id: randomUUID(),
              workItemId,
              verificationReportId: options.report,
              executionTraceId: report?.executionTraceId ?? "",
              decision: options.decision,
              authorizedBy: options.by,
              authorizedByRole: options.role,
              reason: options.reason,
              authorizedAt: new Date().toISOString(),
            },
          });
        if (options.json) console.log(JSON.stringify({ workItemId, decision: options.decision, reportId: options.report }, null, 2));
        else console.log(chalk.green(`✓ Decision '${options.decision}' recorded for '${workItemId}'`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_AUTHORIZE_FAILED", title: chalk.red("✗ Completion authorization failed:") });
      }
    });

  workItemCommand.command("execute <workItemId>").description("Execute a persistent work item through the selected runtime")
    .option("-w, --workspace <path>", "Workspace for the execution", process.cwd())
    .option("-c, --constraint <text>", "Execution constraint")
    .option("-r, --runtime <name>", "Runtime to use (fake by default; pi when selected)")
    .option("--json", "Imprimir el resultado como JSON")
    .action(async (workItemId: string, options: { workspace: string; constraint?: string; runtime?: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const executionTraceId = randomUUID();
        const projectEnvironment = createProjectRuntimeEnvironment({
          config,
          workspace: options.workspace,
          runtime: options.runtime,
          toolInvocationRecorder: store.toolInvocations,
          executionTraceId,
        });
        const { runtimeEnvironment } = projectEnvironment;
        const selectedRuntime = runtimeEnvironment.resolveName(options.runtime);
        if (!options.json) {
          console.log(chalk.cyan(`Executing work item through ${selectedRuntime}...`));
          console.log(chalk.gray(`Work item: ${workItemId}`));
          console.log(chalk.gray(`Workspace: ${options.workspace}`));
        }
        const runtime = runtimeEnvironment.resolve(selectedRuntime);
        const workItemIdValue = new WorkItemId(workItemId);
        const binding = await store.executionBindings.findByWorkItemId(workItemIdValue);
        if (!binding) throw new Error(`Work item '${workItemId}' has no persistent SDD execution binding.`);
        const selection = await store.executionScopeSelections.findByWorkItemId(workItemId);
        if (!selection) throw new CliCommandError(`Work item '${workItemId}' has no HITM-confirmed execution scope; run 'work select' first.`, "WORK_ITEM_SCOPE_REQUIRED", CliExitCode.Guardrail);
        const sddProject = await projectEnvironment.sddProvider.readProject({ root: options.workspace });
        const source = resolveExecutionSource(sddProject, binding);
        assertSpecificationSnapshotMatchesBinding(binding, source.specificationSnapshot);
        if (selection.specificationId !== source.specification.id.value || selection.specificationSnapshotDigest !== source.specificationSnapshot.contentDigest) {
          throw new CliCommandError(`Execution scope for '${workItemId}' is stale; confirm a new scope before execution.`, "WORK_ITEM_SCOPE_STALE", CliExitCode.Conflict);
        }
        const specifications = new InMemoryRepository<Specification, SpecificationId>();
        await specifications.save(source.specification);
        const useCase = new ExecuteStoredWorkItemUseCase(
          store.workItems,
          specifications,
          runtime,
          undefined,
          store.executionTraces,
          projectEnvironment.executionEligibilityPolicy,
        );
        const result = await useCase.execute({
          workItemId: workItemIdValue,
          specificationId: source.specification.id,
          workspace: options.workspace,
          executionConstraints: options.constraint ? [options.constraint] : [],
          selectedRequirementIds: selection.requirementIds,
          trace: {
            id: executionTraceId,
            runtimeId: selectedRuntime,
            change: source.change ? { id: source.change.id, provenance: source.change.provenance } : undefined,
            taskReferences: source.taskReferences,
            specificationSnapshot: source.specificationSnapshot,
            selectedRequirementIds: selection.requirementIds,
            selectedScenarioIds: selection.scenarioIds,
          },
        });
        if (result.status === "completed") {
          if (options.json) console.log(JSON.stringify(result, null, 2));
          else {
            console.log(chalk.green("✓ Work item completed"));
            console.log(chalk.gray(`Runtime session: ${result.runtimeSessionId ?? "N/A"}`));
            console.log(chalk.white(result.summary));
          }
          return;
        }
        if (options.json) {
          writeCliError(io, { message: result.failure?.message ?? result.summary }, { json: true, code: "WORK_ITEM_EXECUTE_FAILED", title: "" });
          return;
        }
        console.log(chalk.red(`✗ Work item ${result.status}`));
        console.log(chalk.red(result.failure?.message ?? result.summary));
        io.setExitCode(1);
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "WORK_ITEM_EXECUTE_FAILED", title: chalk.red("✗ Work item execution failed:") });
      }
    });
};
