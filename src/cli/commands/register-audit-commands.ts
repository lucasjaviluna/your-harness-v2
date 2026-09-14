import type { Command } from "commander";
import chalk from "chalk";
import { createLocalOperationalStore } from "../../persistence/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import type { ToolInvocationTrace } from "../../runtime/tool-invocation-trace.js";

interface AuditTimeOptions {
  readonly from?: string;
  readonly to?: string;
}

const parseTimeRange = (options: AuditTimeOptions): { from?: number; to?: number } => {
  const from = options.from === undefined ? undefined : Date.parse(options.from);
  const to = options.to === undefined ? undefined : Date.parse(options.to);
  if (from !== undefined && Number.isNaN(from)) throw new Error(`Fecha inicial inválida: '${options.from}'. Use una fecha ISO-8601.`);
  if (to !== undefined && Number.isNaN(to)) throw new Error(`Fecha final inválida: '${options.to}'. Use una fecha ISO-8601.`);
  if (from !== undefined && to !== undefined && from > to) throw new Error("El rango temporal requiere --from anterior o igual a --to.");
  return { from, to };
};

const isWithinRange = (timestamp: string, range: { from?: number; to?: number }): boolean => {
  const value = Date.parse(timestamp);
  return !Number.isNaN(value) && (range.from === undefined || value >= range.from) && (range.to === undefined || value <= range.to);
};

const filterInvocations = (items: ReadonlyArray<ToolInvocationTrace>, range: { from?: number; to?: number }): ReadonlyArray<ToolInvocationTrace> =>
  items.filter((item) => isWithinRange(item.invokedAt, range));

const printTrace = (output: Pick<Console, "log">, executionTrace: { id: string; workItemId: string; runtimeId: string; runtimeResult: { status: string }; recordedAt: string }, toolInvocations: ReadonlyArray<ToolInvocationTrace>): void => {
  output.log(chalk.cyan(`ExecutionTrace: ${executionTrace.id}`));
  output.log(`WorkItem: ${executionTrace.workItemId}`);
  output.log(`Runtime: ${executionTrace.runtimeId}`);
  output.log(`Resultado: ${executionTrace.runtimeResult.status}`);
  output.log(`Registrada: ${executionTrace.recordedAt}`);
  output.log(chalk.cyan(`Invocaciones de tools correlacionadas: ${toolInvocations.length}`));
  for (const invocation of toolInvocations) {
    output.log(`- ${invocation.toolName} | ${invocation.outcome} | ${invocation.resolvedPath ?? "N/A"} | ${invocation.bytesRead ?? 0} bytes | ${invocation.invokedAt}`);
  }
};

/** Expone consultas de auditoría sobre ejecuciones y sus invocaciones de tools. */
export const registerAuditCommands = (program: Command, { io }: CliContext): void => {
  const console = createCliConsole(io);
  const audit = program.command("audit").description("Inspeccionar registros operacionales de auditoría");

  audit.command("trace <executionTraceId>")
    .description("Mostrar una traza de ejecución y sus invocaciones de tools correlacionadas")
    .option("-w, --workspace <path>", "Ubicación del estado del workspace", process.cwd())
    .option("--from <timestamp>", "Incluir invocaciones desde esta fecha ISO-8601")
    .option("--to <timestamp>", "Incluir invocaciones hasta esta fecha ISO-8601")
    .option("--json", "Imprimir el registro de auditoría como JSON")
    .action(async (executionTraceId: string, options: { workspace: string; json?: boolean; from?: string; to?: string }) => {
      try {
        const range = parseTimeRange(options);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const executionTrace = await store.executionTraces.findById(executionTraceId);
        if (!executionTrace) throw new Error(`No se encontró la ExecutionTrace '${executionTraceId}'.`);
        const toolInvocations = filterInvocations(await store.toolInvocations.findByExecutionTraceId(executionTraceId), range);
        const auditRecord = { executionTrace, toolInvocations };

        if (options.json) {
          console.log(JSON.stringify(auditRecord, null, 2));
          return;
        }

        printTrace(console, executionTrace, toolInvocations);
      } catch (error) {
        console.log(chalk.red("✗ Audit query failed:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });

  audit.command("work-item <workItemId>")
    .description("Mostrar las ejecuciones y tools auditadas de un WorkItem")
    .option("-w, --workspace <path>", "Ubicación del estado del workspace", process.cwd())
    .option("--from <timestamp>", "Incluir ejecuciones desde esta fecha ISO-8601")
    .option("--to <timestamp>", "Incluir ejecuciones hasta esta fecha ISO-8601")
    .option("--json", "Imprimir el registro de auditoría como JSON")
    .action(async (workItemId: string, options: { workspace: string; json?: boolean; from?: string; to?: string }) => {
      try {
        const range = parseTimeRange(options);
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const executionTraces = (await store.executionTraces.findByWorkItemId(workItemId))
          .filter((trace) => isWithinRange(trace.recordedAt, range));
        const executions = await Promise.all(executionTraces.map(async (executionTrace) => ({
          executionTrace,
          toolInvocations: filterInvocations(await store.toolInvocations.findByExecutionTraceId(executionTrace.id), range),
        })));
        if (options.json) {
          console.log(JSON.stringify({ workItemId, executions }, null, 2));
          return;
        }
        console.log(chalk.cyan(`Auditoría del WorkItem: ${workItemId}`));
        console.log(`Ejecuciones encontradas: ${executions.length}`);
        for (const execution of executions) printTrace(console, execution.executionTrace, execution.toolInvocations);
      } catch (error) {
        console.log(chalk.red("✗ Consulta de auditoría fallida:"));
        console.log(chalk.red((error as Error).message));
        io.setExitCode(1);
      }
    });
};
