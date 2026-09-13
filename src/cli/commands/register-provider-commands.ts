import type { Command } from "commander";
import chalk from "chalk";
import { createConnectorFactory } from "../../connectors/factory.js";
import { createAIManager } from "../../core/ai/manager.js";
import { createAIRegistry } from "../../core/ai/registry.js";
import type { ProviderType } from "../../types/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Registra los comandos de consulta y diagnóstico de proveedores de IA. */
export const registerProviderCommands = (
  program: Command,
  { config, io }: CliContext,
): void => {
  const console = createCliConsole(io);
  const providerCommand = program
    .command("provider")
    .description("Manage AI providers");

  providerCommand
    .command("list")
    .description("List configured AI providers")
    .action(() => {
      console.log(chalk.cyan("Configured AI providers:\n"));

      const factory = createConnectorFactory();
      const connectors = factory.createAll(config);
      const defaultProvider = config.defaultProvider;

      for (const connector of connectors) {
        const name = connector.metadata.name;
        const providerName = name as ProviderType;
        const isDefault = name === defaultProvider;
        const isEnabled = config.providers[providerName]?.enabled ?? false;
        const model = config.providers[providerName]?.model ?? "default";

        const statusIcon = isEnabled ? chalk.green("●") : chalk.red("○");
        const defaultTag = isDefault ? chalk.yellow(" [default]") : "";

        console.log(`  ${statusIcon} ${chalk.bold(name)}${defaultTag}`);
        console.log(chalk.gray(`    Model: ${model}`));
        console.log(
          chalk.gray(`    Status: ${isEnabled ? "enabled" : "disabled"}`),
        );
        console.log();
      }
    });

  providerCommand
    .command("use <name>")
    .description("Set default AI provider")
    .action((name: string) => {
      const validProviders: ProviderType[] = [
        "copilot",
        "claude",
        "openai",
        "local",
        "custom",
      ];

      if (!validProviders.includes(name as ProviderType)) {
        console.log(chalk.red(`Invalid provider: ${name}`));
        console.log(chalk.gray(`Valid providers: ${validProviders.join(", ")}`));
        return;
      }

      console.log(
        chalk.green(`✓ Switching default provider to ${name as ProviderType}...`),
      );
    });

  providerCommand
    .command("test [name]")
    .description("Test an AI provider")
    .option("-p, --prompt <text>", "Test prompt", "Say hello in exactly 3 words.")
    .action(async (name?: string, options?: { prompt?: string }) => {
      const providerName = name ?? config.defaultProvider;
      const testPrompt = options?.prompt ?? "Say hello in exactly 3 words.";

      console.log(chalk.cyan(`Testing provider: ${providerName}`));
      console.log(chalk.gray(`Prompt: "${testPrompt}"\n`));

      try {
        const factory = createConnectorFactory();
        const providerConfig =
          config.providers[providerName as keyof typeof config.providers];

        if (!providerConfig || !providerConfig.enabled) {
          console.log(chalk.yellow(`Provider '${providerName}' is not enabled.`));
          return;
        }

        const connector = factory.create(providerName as ProviderType, providerConfig);
        const registry = createAIRegistry();
        registry.register(connector);
        const manager = createAIManager(registry);

        console.log(chalk.gray("Sending request..."));
        const response = await manager.complete({
          messages: [{ role: "user", content: testPrompt }],
          maxTokens: 50,
        });

        console.log(chalk.green("✓ Response received:\n"));
        console.log(chalk.white(response.message.content));
        console.log();
        console.log(chalk.gray(`Model: ${response.model}`));
        console.log(chalk.gray(`Tokens: ${response.usage?.totalTokens ?? "N/A"}`));
        console.log(chalk.gray(`Finish reason: ${response.finishReason}`));
      } catch (error) {
        console.log(chalk.red("✗ Test failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });
};
