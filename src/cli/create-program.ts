import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../core/config.js";
import { createLogger } from "../core/logger.js";
import { registerAgentCommands } from "./commands/register-agent-commands.js";
import { registerCoreCommands } from "./commands/register-core-commands.js";
import { registerMcpCommands } from "./commands/register-mcp-commands.js";
import { registerPluginCommands } from "./commands/register-plugin-commands.js";
import { registerProviderCommands } from "./commands/register-provider-commands.js";
import { registerSkillCommands } from "./commands/register-skill-commands.js";
import { registerSpecCommands } from "./commands/register-spec-commands.js";
import { registerWorkflowCommands } from "./commands/register-workflow-commands.js";
import { registerWorkItemCommands } from "./commands/register-work-item-commands.js";
import { registerVerificationCommands } from "./commands/register-verification-commands.js";
import { registerAuditCommands } from "./commands/register-audit-commands.js";
import type { CliContext } from "./cli-context.js";
import { createCliAgentRuntime } from "./composition/create-agent-runtime.js";
import { createPluginLoader } from "../plugins/loader.js";
import { createPluginManager } from "../plugins/manager.js";
import { createSkillManager } from "../skills/manager.js";
import { codeReviewSkill } from "../skills/templates/code-review.js";
import { createConsoleCliIo } from "./presentation/cli-io.js";

export interface CreateCliProgramOptions {
  readonly context?: CliContext;
}

export interface CliProgram {
  readonly program: Command;
  readonly context: CliContext;
}

/** Crea el programa raíz y registra los comandos que ya fueron extraídos. */
export const createCliProgram = (
  options: CreateCliProgramOptions = {},
): CliProgram => {
  const context = options.context ?? (() => {
    const config = loadConfig();
    return { config, logger: createLogger(config.logLevel), io: createConsoleCliIo() };
  })();
  const program = new Command();

  program
    .name("yh")
    .description(chalk.bold("your-harness - AI-powered development harness"))
    .version(context.config.version)
    .hook("preAction", (thisCommand) => {
      context.logger.debug(`Executing: yh ${thisCommand.args.join(" ")}`);
    });

  registerCoreCommands(program, context);
  registerMcpCommands(program, context);
  registerProviderCommands(program, context);
  const agentRuntime = createCliAgentRuntime();
  registerAgentCommands(program, context, agentRuntime);
  registerWorkflowCommands(program, context, agentRuntime);
  registerSpecCommands(program, context);
  registerWorkItemCommands(program, context);
  registerVerificationCommands(program, context);
  registerAuditCommands(program, context);

  const pluginManager = createPluginManager(createPluginLoader());
  registerPluginCommands(program, context, pluginManager);

  const skillManager = createSkillManager();
  skillManager.register(codeReviewSkill);
  registerSkillCommands(program, context, skillManager);

  return { program, context };
};
