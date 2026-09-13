import type { Command } from "commander";
import chalk from "chalk";
import type { ToolExecutor } from "../../agents/types.js";
import { createConnectorFactory } from "../../connectors/factory.js";
import { createAIManager } from "../../core/ai/manager.js";
import { createAIRegistry } from "../../core/ai/registry.js";
import type { ToolResult } from "../../core/ai/types.js";
import type { ProviderType } from "../../types/index.js";
import type { CliContext } from "../cli-context.js";
import type { CliAgentRuntime } from "../composition/create-agent-runtime.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Registra los comandos de descubrimiento y ejecución de agentes. */
export const registerAgentCommands = (
  program: Command,
  { config, io }: CliContext,
  agentRuntime: CliAgentRuntime,
): void => {
  const console = createCliConsole(io);
  const { agents, runner } = agentRuntime;
  const agentCommand = program.command("agent").description("Manage and run AI agents");

  agentCommand
    .command("list")
    .description("List available agents")
    .action(() => {
      console.log(chalk.cyan("Available agents:\n"));
      for (const [name, agent] of Object.entries(agents)) {
        console.log(`  ${chalk.bold(name)} v${agent.version}`);
        console.log(chalk.gray(`    ${agent.description}`));
        console.log(chalk.gray(`    Tools: ${agent.tools?.map((tool) => tool.name).join(", ") ?? "none"}`));
        console.log(chalk.gray(`    Max iterations: ${agent.maxIterations}`));
        console.log();
      }
    });

  agentCommand
    .command("run <agent> <objective>")
    .description("Run an agent with an objective")
    .option("-p, --provider <name>", "AI provider to use")
    .option("-m, --model <name>", "Model to use")
    .action(async (
      agentName: string,
      objective: string,
      options: { provider?: string; model?: string },
    ) => {
      const agent = agents[agentName];
      if (!agent) {
        console.log(chalk.red(`Unknown agent: ${agentName}`));
        console.log(chalk.gray(`Available agents: ${Object.keys(agents).join(", ")}`));
        return;
      }

      console.log(chalk.cyan(`Running agent: ${agent.name}`));
      console.log(chalk.gray(`Objective: ${objective}`));
      console.log(chalk.gray(`Provider: ${options.provider ?? config.defaultProvider}`));
      console.log();

      try {
        const factory = createConnectorFactory();
        const providerName = options.provider ?? config.defaultProvider;
        const providerConfig = config.providers[providerName as keyof typeof config.providers];
        if (!providerConfig || !providerConfig.enabled) {
          console.log(chalk.red(`Provider '${providerName}' is not enabled.`));
          return;
        }
        if (options.model) providerConfig.model = options.model;

        const connector = factory.create(providerName as ProviderType, providerConfig);
        const registry = createAIRegistry();
        registry.register(connector);
        const aiManager = createAIManager(registry);
        const toolExecutor: ToolExecutor = {
          execute: async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
            console.log(chalk.blue(`  🔧 Tool: ${name}`), chalk.gray(JSON.stringify(args)));
            return {
              toolCallId: name,
              content: `Tool '${name}' executed successfully with args: ${JSON.stringify(args)}`,
            };
          },
          listTools: () => agent.tools ?? [],
        };

        const result = await runner.run(agent, objective, {
          session: {
            id: `cli_${Date.now()}`,
            project: process.cwd(),
            mode: config.mode,
            provider: providerName as ProviderType,
            startedAt: new Date(),
            mcpServers: [],
          },
          toolExecutor,
          aiManager,
          onEvent: (event) => {
            switch (event.type) {
              case "step:start":
                console.log(chalk.gray(`  Step ${(event.data as { iteration: number }).iteration + 1}...`));
                break;
              case "tool:start":
                console.log(chalk.blue("  🔧 Executing tool..."));
                break;
              case "tool:complete": {
                const toolStep = event.data as { duration: number };
                console.log(chalk.green(`  ✓ Tool completed in ${toolStep.duration}ms`));
                break;
              }
              case "agent:error":
                console.log(chalk.red(`  ✗ Error: ${(event.data as { error: string }).error}`));
                break;
            }
          },
        });

        console.log();
        if (result.success) {
          console.log(chalk.green("✓ Agent completed successfully"));
          console.log(chalk.gray(`  Iterations: ${result.iterations}`));
          console.log(chalk.gray(`  Duration: ${(result.totalDuration / 1000).toFixed(1)}s`));
          console.log();
          console.log(chalk.white(result.finalMessage));
          return;
        }

        console.log(chalk.red("✗ Agent failed"));
        console.log(chalk.red(`  Error: ${result.error}`));
      } catch (error) {
        console.log(chalk.red("✗ Agent execution failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });
};
