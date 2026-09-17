import type { Command } from "commander";
import chalk from "chalk";
import type { ToolExecutor } from "../../agents/types.js";
import { createConnectorFactory } from "../../connectors/factory.js";
import { createAIManager } from "../../core/ai/manager.js";
import { createAIRegistry } from "../../core/ai/registry.js";
import type { ToolResult } from "../../core/ai/types.js";
import type { ProviderType } from "../../types/index.js";
import { codeReviewPipeline } from "../../workflows/builtin/code-review-pipeline.js";
import { createWorkflowEngine } from "../../workflows/engine.js";
import type { WorkflowDefinition } from "../../workflows/types.js";
import type { CliContext } from "../cli-context.js";
import type { CliAgentRuntime } from "../composition/create-agent-runtime.js";
import { createCliConsole } from "../presentation/cli-io.js";

const builtInWorkflows: Record<string, WorkflowDefinition> = {
  "code-review": codeReviewPipeline,
};

/** Registra los comandos de descubrimiento y ejecución de workflows. */
export const registerWorkflowCommands = (
  program: Command,
  { config, io }: CliContext,
  agentRuntime: CliAgentRuntime,
): void => {
  const console = createCliConsole(io);
  const workflowEngine = createWorkflowEngine();
  const workflowCommand = program.command("workflow").description("Manage and run workflows");

  workflowCommand
    .command("list")
    .description("List available workflows")
    .action(() => {
      console.log(chalk.cyan("Available workflows:\n"));
      for (const [name, workflow] of Object.entries(builtInWorkflows)) {
        console.log(`  ${chalk.bold(name)} v${workflow.version}`);
        console.log(chalk.gray(`    ${workflow.description}`));
        console.log(chalk.gray(`    Steps: ${workflow.steps.length}`));
        if (workflow.triggers) {
          console.log(chalk.gray(`    Triggers: ${workflow.triggers.map((trigger) => trigger.type).join(", ")}`));
        }
        console.log();
      }
    });

  workflowCommand
    .command("run <name>")
    .description("Run a workflow")
    .option("-p, --provider <name>", "AI provider to use")
    .action(async (name: string, options: { provider?: string }) => {
      const workflow = builtInWorkflows[name];
      if (!workflow) {
        console.log(chalk.red(`Unknown workflow: ${name}`));
        console.log(chalk.gray(`Available workflows: ${Object.keys(builtInWorkflows).join(", ")}`));
        return;
      }

      console.log(chalk.cyan(`Running workflow: ${workflow.name}`));
      console.log(chalk.gray(`Description: ${workflow.description}`));
      console.log(chalk.gray(`Steps: ${workflow.steps.length}`));
      console.log();

      try {
        const factory = createConnectorFactory();
        const providerName = options.provider ?? config.defaultProvider;
        const providerConfig = config.providers[providerName as keyof typeof config.providers];
        if (!providerConfig || !providerConfig.enabled) {
          console.log(chalk.red(`Provider '${providerName}' is not enabled.`));
          return;
        }

        const connector = factory.create(providerName as ProviderType, providerConfig);
        const registry = createAIRegistry();
        registry.register(connector);
        const aiManager = createAIManager(registry);
        const toolExecutor: ToolExecutor = {
          execute: async (toolName: string, args: Record<string, unknown>): Promise<ToolResult> => {
            console.log(chalk.blue(`  🔧 Tool: ${toolName}`), chalk.gray(JSON.stringify(args)));
            return {
              toolCallId: toolName,
              content: `Tool '${toolName}' no está implementada en el workflow experimental; no se ejecutó ninguna operación.`,
              isError: true,
            };
          },
          listTools: () => [],
        };

        const result = await workflowEngine.execute(workflow, {
          session: {
            id: `wf_${Date.now()}`,
            project: process.cwd(),
            mode: config.mode,
            provider: providerName as ProviderType,
            startedAt: new Date(),
            mcpServers: [],
          },
          agentRunner: agentRuntime.runner,
          aiManager,
          toolExecutor,
          agents: agentRuntime.agents,
          onEvent: (event) => {
            switch (event.type) {
              case "workflow:start": console.log(chalk.gray("Workflow started")); break;
              case "step:start": console.log(chalk.gray(`  ▶ ${event.stepId}`)); break;
              case "step:complete": console.log(chalk.green(`  ✓ ${event.stepId} completed`)); break;
              case "step:error": console.log(chalk.red(`  ✗ ${event.stepId} failed`)); break;
              case "step:skip": console.log(chalk.yellow(`  ↷ ${event.stepId} skipped`)); break;
              case "workflow:complete": console.log(chalk.green("\n✓ Workflow completed")); break;
              case "workflow:error": console.log(chalk.red("\n✗ Workflow failed")); break;
            }
          },
        });

        if (result.success) {
          console.log(chalk.gray(`Duration: ${(result.totalDuration / 1000).toFixed(1)}s`));
          console.log(chalk.gray(`Steps completed: ${result.steps.filter((step) => step.success).length}/${result.steps.length}`));
          return;
        }
        console.log(chalk.red(`Error: ${result.error}`));
      } catch (error) {
        console.log(chalk.red("✗ Workflow execution failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });
};
