import type { Command } from "commander";
import chalk from "chalk";
import { createLocalOperationalStore } from "../../persistence/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Expone consultas de auditoría sobre ejecuciones y sus invocaciones de tools. */
export const registerAuditCommands = (program: Command, { io }: CliContext): void => {
  const console = createCliConsole(io);
  const audit = program.command("audit").description("Inspect operational execution audit records");

  audit.command("trace <executionTraceId>")
    .description("Show an execution trace and its correlated tool invocations")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Print the audit record as JSON")
    .action(async (executionTraceId: string, options: { workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const executionTrace = await store.executionTraces.findById(executionTraceId);
        if (!executionTrace) throw new Error(`ExecutionTrace '${executionTraceId}' was not found.`);
        const toolInvocations = await store.toolInvocations.findByExecutionTraceId(executionTraceId);
        const auditRecord = { executionTrace, toolInvocations };

        if (options.json) {
          console.log(JSON.stringify(auditRecord, null, 2));
          return;
        }

        console.log(chalk.cyan(`Execution trace: ${executionTrace.id}`));
        console.log(`Work item: ${executionTrace.workItemId}`);
        console.log(`Runtime: ${executionTrace.runtimeId}`);
        console.log(`Result: ${executionTrace.runtimeResult.status}`);
        console.log(`Recorded at: ${executionTrace.recordedAt}`);
        console.log(chalk.cyan(`Correlated tool invocations: ${toolInvocations.length}`));
        for (const invocation of toolInvocations) {
          console.log(`- ${invocation.toolName} | ${invocation.outcome} | ${invocation.resolvedPath ?? "N/A"} | ${invocation.bytesRead ?? 0} bytes`);
        }
      } catch (error) {
        console.log(chalk.red("✗ Audit query failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });
};
