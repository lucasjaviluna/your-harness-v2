import type { Command } from "commander";
import chalk from "chalk";
import { createSkillManager } from "../../skills/manager.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

type SkillManager = ReturnType<typeof createSkillManager>;

/** Registra los comandos que consultan y habilitan skills instaladas. */
export const registerSkillCommands = (
  program: Command,
  { io }: CliContext,
  skillManager: SkillManager,
): void => {
  const console = createCliConsole(io);
  const skillCommand = program.command("skill").description("Manage skills");

  skillCommand
    .command("list")
    .description("List available skills")
    .option("-c, --category <category>", "Filter by category")
    .action((options: { category?: string }) => {
      const skills = options.category
        ? skillManager.listByCategory(options.category as never)
        : skillManager.list();

      if (skills.length === 0) {
        console.log(chalk.gray("No skills found."));
        return;
      }

      console.log(chalk.cyan("Available skills:\n"));
      for (const skill of skills) {
        const statusIcon = skill.enabled ? chalk.green("●") : chalk.gray("○");
        console.log(`  ${statusIcon} ${chalk.bold(skill.definition.name)} v${skill.definition.version}`);
        console.log(chalk.gray(`    Category: ${skill.definition.category}`));
        console.log(chalk.gray(`    Status: ${skill.enabled ? "enabled" : "disabled"}`));
        if (skill.definition.templates) {
          console.log(chalk.gray(`    Templates: ${skill.definition.templates.map((template) => template.name).join(", ")}`));
        }
        console.log();
      }
    });

  skillCommand
    .command("enable <name>")
    .description("Enable a skill")
    .action((name: string) => {
      try {
        skillManager.enable(name);
        console.log(chalk.green(`✓ Skill '${name}' enabled`));
      } catch (error) {
        console.log(chalk.red("✗ Enable failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });

  skillCommand
    .command("disable <name>")
    .description("Disable a skill")
    .action((name: string) => {
      try {
        skillManager.disable(name);
        console.log(chalk.yellow(`✓ Skill '${name}' disabled`));
      } catch (error) {
        console.log(chalk.red("✗ Disable failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });
};
