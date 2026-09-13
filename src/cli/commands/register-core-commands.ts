import type { Command } from "commander";
import chalk from "chalk";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Registra comandos que sólo consultan la configuración de la herramienta. */
export const registerCoreCommands = (
  program: Command,
  { config, io }: CliContext,
): void => {
  const console = createCliConsole(io);
  program
    .command("version")
    .description("Show version information")
    .action(() => {
      console.log(chalk.cyan(`your-harness v${config.version}`));
      console.log(chalk.gray(`Node: ${process.version}`));
      console.log(chalk.gray(`Mode: ${config.mode}`));
      console.log(chalk.gray(`Default provider: ${config.defaultProvider}`));
    });

  program
    .command("config")
    .description("Manage configuration")
    .option("--show", "Show current configuration")
    .action((options) => {
      if (options.show || Object.keys(options).length === 0) {
        console.log(chalk.cyan("Current configuration:"));
        console.log(chalk.gray(JSON.stringify(config, null, 2)));
      }
    });

  program
    .command("mode")
    .description("Set working mode")
    .argument("[mode]", "Mode to activate")
    .action((mode?: string) => {
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
          console.log(chalk.red(`Invalid mode: ${mode}`));
          console.log(chalk.gray(`Valid modes: ${validModes.join(", ")}`));
          return;
        }
        console.log(chalk.green(`✓ Switching to ${mode} mode...`));
        return;
      }

      console.log(chalk.cyan(`Current mode: ${config.mode}`));
      console.log(chalk.gray(`Available modes: ${validModes.join(", ")}`));
    });
};
