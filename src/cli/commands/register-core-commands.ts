import type { Command } from "commander";
import chalk from "chalk";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import { writeCliError } from "../presentation/cli-errors.js";

/** Registra comandos que sólo consultan la configuración de la herramienta. */
export const registerCoreCommands = (
  program: Command,
  { config, io }: CliContext,
): void => {
  const console = createCliConsole(io);
  program
    .command("version")
    .description("Show version information")
    .option("--json", "Imprimir información de versión como JSON")
    .action((options: { json?: boolean }) => {
      if (options.json) {
        console.log(JSON.stringify({ version: config.version, node: process.version, mode: config.mode, defaultProvider: config.defaultProvider }, null, 2));
        return;
      }
      console.log(chalk.cyan(`your-harness v${config.version}`));
      console.log(chalk.gray(`Node: ${process.version}`));
      console.log(chalk.gray(`Mode: ${config.mode}`));
      console.log(chalk.gray(`Default provider: ${config.defaultProvider}`));
    });

  program
    .command("config")
    .description("Manage configuration")
    .option("--show", "Show current configuration")
    .option("--json", "Imprimir la configuración como JSON")
    .action((options: { show?: boolean; json?: boolean }) => {
      if (options.show || Object.keys(options).length === 0) {
        if (options.json) {
          console.log(JSON.stringify(config, null, 2));
          return;
        }
        console.log(chalk.cyan("Current configuration:"));
        console.log(chalk.gray(JSON.stringify(config, null, 2)));
      }
    });

  program
    .command("mode")
    .description("Set working mode")
    .argument("[mode]", "Mode to activate")
    .option("--json", "Imprimir el resultado como JSON")
    .action((mode: string | undefined, options: { json?: boolean }) => {
      const validModes = [
        "frontend",
        "backend",
        "devops",
        "testing",
        "analysis",
        "custom",
      ];

      if (mode) {
        if (!validModes.includes(mode)) {
          if (options.json) {
            writeCliError(io, new Error(`Invalid mode: ${mode}`), { json: true, code: "CORE_MODE_INVALID", title: "" });
            return;
          }
          console.log(chalk.red(`Invalid mode: ${mode}`));
          console.log(chalk.gray(`Valid modes: ${validModes.join(", ")}`));
          return;
        }
        if (options.json) console.log(JSON.stringify({ mode, changed: true }, null, 2));
        else console.log(chalk.green(`✓ Switching to ${mode} mode...`));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify({ mode: config.mode, availableModes: validModes }, null, 2));
        return;
      }

      console.log(chalk.cyan(`Current mode: ${config.mode}`));
      console.log(chalk.gray(`Available modes: ${validModes.join(", ")}`));
    });
};
