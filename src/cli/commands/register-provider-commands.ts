import type { Command } from "commander";
import chalk from "chalk";
import { createConnectorFactory } from "../../connectors/factory.js";
import { createAIManager } from "../../core/ai/manager.js";
import { createAIRegistry } from "../../core/ai/registry.js";
import type { ProviderType } from "../../types/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import { CliExitCode, writeCliError } from "../presentation/cli-errors.js";

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
    .option("--json", "Imprimir proveedores como JSON")
    .action((options: { json?: boolean }) => {
      console.log(chalk.cyan("Configured AI providers:\n"));

      const factory = createConnectorFactory();
      const connectors = factory.createAll(config);
      const defaultProvider = config.defaultProvider;

      if (options.json) {
        console.log(JSON.stringify(connectors.map((connector) => {
          const name = connector.metadata.name as ProviderType;
          return { name, enabled: config.providers[name]?.enabled ?? false, model: config.providers[name]?.model ?? "default", default: name === defaultProvider };
        }), null, 2));
        return;
      }

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
    .option("--json", "Imprimir el resultado como JSON")
    .action((name: string, options: { json?: boolean }) => {
      const validProviders: ProviderType[] = [
        "copilot",
        "claude",
        "openai",
        "local",
        "custom",
      ];

      if (!validProviders.includes(name as ProviderType)) {
        if (options.json) {
          writeCliError(io, new Error(`Invalid provider: ${name}`), { json: true, code: "PROVIDER_INVALID", exitCode: CliExitCode.Usage, title: "" });
          return;
        }
        console.log(chalk.red(`Invalid provider: ${name}`));
        console.log(chalk.gray(`Valid providers: ${validProviders.join(", ")}`));
        return;
      }

      if (options.json) console.log(JSON.stringify({ provider: name, changed: true }, null, 2));
      else console.log(chalk.green(`✓ Switching default provider to ${name as ProviderType}...`));
    });

  providerCommand
    .command("test [name]")
    .description("Test an AI provider")
    .option("-p, --prompt <text>", "Test prompt", "Say hello in exactly 3 words.")
    .option("--json", "Imprimir el resultado como JSON")
    .action(async (name?: string, options?: { prompt?: string; json?: boolean }) => {
      const providerName = name ?? config.defaultProvider;
      const testPrompt = options?.prompt ?? "Say hello in exactly 3 words.";

      if (!options?.json) {
        console.log(chalk.cyan(`Testing provider: ${providerName}`));
        console.log(chalk.gray(`Prompt: "${testPrompt}"\n`));
      }

      try {
        const factory = createConnectorFactory();
        const providerConfig =
          config.providers[providerName as keyof typeof config.providers];

        if (!providerConfig || !providerConfig.enabled) {
          if (options?.json) {
            writeCliError(io, new Error(`Provider '${providerName}' is not enabled.`), { json: true, code: "PROVIDER_NOT_ENABLED", exitCode: CliExitCode.Conflict, title: "" });
            return;
          }
          console.log(chalk.yellow(`Provider '${providerName}' is not enabled.`));
          return;
        }

        const connector = factory.create(providerName as ProviderType, providerConfig);
        const registry = createAIRegistry();
        registry.register(connector);
        const manager = createAIManager(registry);

        if (!options?.json) console.log(chalk.gray("Sending request..."));
        const response = await manager.complete({
          messages: [{ role: "user", content: testPrompt }],
          maxTokens: 50,
        });

        if (options?.json) {
          console.log(JSON.stringify({ provider: providerName, response }, null, 2));
          return;
        }
        console.log(chalk.green("✓ Response received:\n"));
        console.log(chalk.white(response.message.content));
        console.log();
        console.log(chalk.gray(`Model: ${response.model}`));
        console.log(chalk.gray(`Tokens: ${response.usage?.totalTokens ?? "N/A"}`));
        console.log(chalk.gray(`Finish reason: ${response.finishReason}`));
      } catch (error) {
        writeCliError(io, error, { json: options?.json, code: "PROVIDER_TEST_FAILED", title: chalk.red("✗ Test failed:") });
      }
    });
};
