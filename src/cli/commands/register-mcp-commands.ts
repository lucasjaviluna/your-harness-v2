import type { Command } from "commander";
import chalk from "chalk";
import { createMCPClient } from "../../mcp/client.js";
import { createMCPServer } from "../../mcp/server.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";

/** Registra los comandos de conexión, servidor local y estado MCP. */
export const registerMcpCommands = (
  program: Command,
  { config, io }: CliContext,
): void => {
  const console = createCliConsole(io);
  const mcpCommand = program.command("mcp").description("Manage MCP servers and clients");

  mcpCommand
    .command("connect <name>")
    .description("Connect to an MCP server")
    .option("-u, --url <url>", "Server URL")
    .option("-t, --type <type>", "Connection type (stdio, sse)")
    .action(async (name: string, options: { url?: string; type?: string }) => {
      try {
        const client = createMCPClient({
          name,
          command: name,
          enabled: true,
          ...(options.url && { url: options.url }),
          ...(options.type && { type: options.type as "stdio" | "sse" }),
        });
        console.log(chalk.gray(`Connecting to MCP server '${name}'...`));
        await client.connect();
        console.log(chalk.green(`✓ Connected to ${name}`));

        const tools = await client.listTools();
        if (tools.length > 0) {
          console.log(chalk.cyan("\nAvailable tools:"));
          for (const tool of tools) console.log(`  ${chalk.bold(tool.name)}: ${tool.description}`);
        }
        await client.disconnect();
      } catch (error) {
        console.log(chalk.red("✗ Connection failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });

  mcpCommand
    .command("start")
    .description("Start a local MCP server")
    .action(async () => {
      try {
        const server = createMCPServer();
        server.registerTool(
          {
            name: "get_project_info",
            description: "Get information about the current project",
            inputSchema: { type: "object", properties: {} },
          },
          async () => ({ name: "your-harness", version: config.version, mode: config.mode, cwd: process.cwd() }),
        );
        server.registerTool(
          {
            name: "echo",
            description: "Echoes back the input message",
            inputSchema: {
              type: "object",
              properties: { message: { type: "string", description: "Message to echo" } },
              required: ["message"],
            },
          },
          async (args) => ({ echoed: args.message }),
        );

        console.log(chalk.cyan("Starting MCP server..."));
        await server.start();
        console.log(chalk.green("✓ MCP server is running"));
        console.log(chalk.gray("Send JSON-RPC requests via stdin. Press Ctrl+C to stop."));
        process.on("SIGINT", async () => {
          console.log();
          await server.stop();
          process.exit(0);
        });
      } catch (error) {
        console.log(chalk.red("✗ Server start failed:"));
        console.log(chalk.red((error as Error).message));
      }
    });

  mcpCommand
    .command("status")
    .description("Show MCP connection status")
    .action(() => {
      console.log(chalk.cyan("MCP Status:\n"));
      const configuredServers = config.mcpServers ?? [];
      if (configuredServers.length === 0) {
        console.log(chalk.gray("No MCP servers configured."));
        console.log(chalk.gray("Add servers in ~/.your-harness/config.yml"));
        return;
      }

      for (const server of configuredServers) {
        const statusIcon = server.enabled ? chalk.green("●") : chalk.red("○");
        console.log(`  ${statusIcon} ${chalk.bold(server.name)}`);
        console.log(chalk.gray(`    Command: ${server.command}`));
        console.log(chalk.gray(`    Status: ${server.enabled ? "configured" : "disabled"}`));
        console.log();
      }
    });
};
