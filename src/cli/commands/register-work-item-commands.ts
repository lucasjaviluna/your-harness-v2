import { randomUUID } from "node:crypto";
import type { Command } from "commander";
import chalk from "chalk";
import { CompleteWorkItemUseCase, ExecuteStoredWorkItemUseCase, InMemoryRepository } from "@your-harness/application";
import { IntentId, Specification, SpecificationId, WorkItem, WorkItemId, WorkItemTitle } from "@your-harness/domain";
import { createLocalOperationalStore } from "../../persistence/index.js";
import { createProjectRuntimeEnvironment } from "../../runtime/index.js";
import { assertSpecificationSnapshotMatchesBinding, resolveExecutionSource } from "../../sdd/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

type CompletionDecision = "authorize-completion" | "request-rework" | "require-further-review";

/** Registra el flujo operacional durable de WorkItems. */
export const registerWorkItemCommands = (program: Command, { config, io }: CliContext): void => {
  const console = createCliConsole(io);
  const workItemCommand = program.command("work-item").alias("work").description("Execute engineering work items");

  workItemCommand.command("create <workItemId>").description("Create a persistent WorkItem")
    .requiredOption("-t, --title <text>", "Work item objective")
    .option("-i, --intent <id>", "Intent identifier", "default-intent")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .action(async (workItemId: string, options: { title: string; intent: string; workspace: string }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        if (await store.workItems.findById(id)) throw new Error(`Work item '${workItemId}' already exists.`);
        await store.workItems.save(new WorkItem(id, new IntentId(options.intent), new WorkItemTitle(options.title)));
        console.log(chalk.green(`✓ Work item '${workItemId}' persisted`));
      } catch (error) {
        console.log(chalk.red("✗ Work item creation failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  workItemCommand.command("bind <workItemId>").description("Bind a WorkItem to the configured SDD source")
    .requiredOption("-s, --specification <id>", "SDD specification identifier")
    .requiredOption("--approve-specification", "Explicitly authorize this SDD projection for execution")
    .option("-c, --change <id>", "SDD Change identifier")
    .option("-t, --task <id>", "SDD Change task identifier", (value, previous: string[] = []) => [...previous, value])
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .action(async (workItemId: string, options: { specification: string; approveSpecification: boolean; change?: string; task?: string[]; workspace: string }) => {
      try {
        const projectEnvironment = createProjectRuntimeEnvironment({ config, workspace: options.workspace });
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        if (!(await store.workItems.findById(id))) throw new Error(`Work item '${workItemId}' was not found in local operational state.`);
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
        console.log(chalk.green(`✓ Work item '${workItemId}' bound to SDD specification '${options.specification}'`));
      } catch (error) {
        console.log(chalk.red("✗ Work item binding failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  workItemCommand.command("start <workItemId>").description("Start a persisted WorkItem")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .action(async (workItemId: string, options: { workspace: string }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const id = new WorkItemId(workItemId);
        const workItem = await store.workItems.findById(id);
        if (!workItem) throw new Error(`Work item '${workItemId}' not found.`);
        await store.workItems.save(workItem.start());
        console.log(chalk.green(`✓ Work item '${workItemId}' started`));
      } catch (error) {
        console.log(chalk.red("✗ Work item start failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  workItemCommand.command("authorize <workItemId>").description("Apply an explicit verification decision to a persisted WorkItem")
    .requiredOption("-r, --report <id>", "VerificationReport identifier")
    .requiredOption("-d, --decision <decision>", "authorize-completion, request-rework or require-further-review")
    .requiredOption("-b, --by <actor>", "Authorizing actor")
    .requiredOption("--role <role>", "Actor role: engineer, reviewer, maintainer or owner")
    .requiredOption("--reason <text>", "Reason for the decision")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .action(async (workItemId: string, options: { report: string; decision: CompletionDecision; by: string; role: "engineer" | "reviewer" | "maintainer" | "owner"; reason: string; workspace: string }) => {
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
        console.log(chalk.green(`✓ Decision '${options.decision}' recorded for '${workItemId}'`));
      } catch (error) {
        console.log(chalk.red("✗ Completion authorization failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  workItemCommand.command("execute <workItemId>").description("Execute a persistent work item through the selected runtime")
    .option("-w, --workspace <path>", "Workspace for the execution", process.cwd())
    .option("-c, --constraint <text>", "Execution constraint")
    .option("-r, --runtime <name>", "Runtime to use (fake by default; pi when selected)")
    .action(async (workItemId: string, options: { workspace: string; constraint?: string; runtime?: string }) => {
      const projectEnvironment = createProjectRuntimeEnvironment({ config, workspace: options.workspace, runtime: options.runtime });
      const { runtimeEnvironment } = projectEnvironment;
      const selectedRuntime = runtimeEnvironment.resolveName(options.runtime);
      console.log(chalk.cyan(`Executing work item through ${selectedRuntime}...`));
      console.log(chalk.gray(`Work item: ${workItemId}`));
      console.log(chalk.gray(`Workspace: ${options.workspace}`));

      try {
        const runtime = runtimeEnvironment.resolve(selectedRuntime);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const workItemIdValue = new WorkItemId(workItemId);
        const binding = await store.executionBindings.findByWorkItemId(workItemIdValue);
        if (!binding) throw new Error(`Work item '${workItemId}' has no persistent SDD execution binding.`);
        const sddProject = await projectEnvironment.sddProvider.readProject({ root: options.workspace });
        const source = resolveExecutionSource(sddProject, binding);
        assertSpecificationSnapshotMatchesBinding(binding, source.specificationSnapshot);
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
          trace: {
            id: randomUUID(),
            runtimeId: selectedRuntime,
            change: source.change ? { id: source.change.id, provenance: source.change.provenance } : undefined,
            taskReferences: source.taskReferences,
            specificationSnapshot: source.specificationSnapshot,
          },
        });
        if (result.status === "completed") {
          console.log(chalk.green("✓ Work item completed"));
          console.log(chalk.gray(`Runtime session: ${result.runtimeSessionId ?? "N/A"}`));
          console.log(chalk.white(result.summary));
          return;
        }
        console.log(chalk.red(`✗ Work item ${result.status}`));
        console.log(chalk.red(result.failure?.message ?? result.summary));
        io.setExitCode(1);
      } catch (error) {
        console.log(chalk.red("✗ Work item execution failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });
};
