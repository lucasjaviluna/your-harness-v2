import type { Command } from "commander";
import chalk from "chalk";
import { createPluginManager } from "../../plugins/manager.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

type PluginManager = ReturnType<typeof createPluginManager>;

/** Registra los comandos que administran plugins locales. */
export const registerPluginCommands = (
  program: Command,
  { io }: CliContext,
  pluginManager: PluginManager,
): void => {
  const console = createCliConsole(io);
  const pluginCommand = program.command("plugin").description("Manage plugins");

  pluginCommand
    .command("install <path>")
    .description("Install a plugin from a local path")
    .action(async (path: string) => {
      try {
        console.log(chalk.gray(`Installing plugin from ${path}...`));
        const plugin = await pluginManager.install(path);
        console.log(chalk.green(`✓ Plugin '${plugin.manifest.name}' v${plugin.manifest.version} installed`));
      } catch (error) {
        console.log(chalk.red("✗ Install failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });

  pluginCommand
    .command("list")
    .description("List installed plugins")
    .action(() => {
      const plugins = pluginManager.list();
      if (plugins.length === 0) {
        console.log(chalk.gray("No plugins installed."));
        return;
      }

      console.log(chalk.cyan("Installed plugins:\n"));
      for (const plugin of plugins) {
        const statusIcon = plugin.status === "enabled"
          ? chalk.green("●")
          : plugin.status === "disabled" ? chalk.yellow("○") : chalk.red("○");
        console.log(`  ${statusIcon} ${chalk.bold(plugin.manifest.name)} v${plugin.manifest.version}`);
        console.log(chalk.gray(`    Status: ${plugin.status}`));
        console.log(chalk.gray(`    Type: ${plugin.manifest.type}`));
        console.log(chalk.gray(`    Path: ${plugin.path}`));
        console.log();
      }
    });

  pluginCommand
    .command("enable <name>")
    .description("Enable a plugin")
    .action(async (name: string) => {
      try {
        await pluginManager.enable(name);
        console.log(chalk.green(`✓ Plugin '${name}' enabled`));
      } catch (error) {
        console.log(chalk.red("✗ Enable failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });

  pluginCommand
    .command("disable <name>")
    .description("Disable a plugin")
    .action(async (name: string) => {
      try {
        await pluginManager.disable(name);
        console.log(chalk.yellow(`✓ Plugin '${name}' disabled`));
      } catch (error) {
        console.log(chalk.red("✗ Disable failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });
};
