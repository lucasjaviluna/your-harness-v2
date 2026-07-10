#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { createConnectorFactory } from '../connectors/factory.js';
import { createAIRegistry } from '../core/ai/registry.js';
import { createAIManager } from '../core/ai/manager.js';
import { createPluginLoader } from '../plugins/loader.js';
import { createPluginManager } from '../plugins/manager.js';
import { createSkillManager } from '../skills/manager.js';
import { codeReviewSkill } from '../skills/templates/code-review.js';
import { createAgentRunner } from '../agents/runner.js';
import { developerAgent } from '../agents/builtin/developer.js';
import { reviewerAgent } from '../agents/builtin/reviewer.js';
import { createMCPClient } from '../mcp/client.js';
import { createMCPServer } from '../mcp/server.js';
import type { AgentDefinition, ToolExecutor } from '../agents/types.js';
import type { ToolResult } from '../core/ai/types.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

// Inicializar managers
const pluginLoader = createPluginLoader();
const pluginManager = createPluginManager(pluginLoader);
const skillManager = createSkillManager();
const agentRunner = createAgentRunner();

// Registrar skills y agentes built-in
skillManager.register(codeReviewSkill);

const builtInAgents: Record<string, AgentDefinition> = {
  developer: developerAgent,
  reviewer: reviewerAgent,
};

const program = new Command();

program
  .name('yh')
  .description(chalk.bold('your-harness - AI-powered development harness'))
  .version(config.version)
  .hook('preAction', (thisCommand) => {
    logger.debug(`Executing: yh ${thisCommand.args.join(' ')}`);
  });

// Comando: version
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(chalk.cyan(`your-harness v${config.version}`));
    console.log(chalk.gray(`Node: ${process.version}`));
    console.log(chalk.gray(`Mode: ${config.mode}`));
    console.log(chalk.gray(`Default provider: ${config.defaultProvider}`));
  });

// Comando: config
program
  .command('config')
  .description('Manage configuration')
  .option('--show', 'Show current configuration')
  .action((options) => {
    if (options.show || Object.keys(options).length === 0) {
      console.log(chalk.cyan('Current configuration:'));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));
    }
  });

// Comando: mode
program
  .command('mode')
  .description('Set working mode')
  .argument('[mode]', 'Mode to activate')
  .action((mode?: string) => {
    const validModes = ['frontend', 'backend', 'devops', 'testing', 'analysis', 'custom'];
    
    if (mode) {
      if (!validModes.includes(mode)) {
        console.log(chalk.red(`Invalid mode: ${mode}`));
        console.log(chalk.gray(`Valid modes: ${validModes.join(', ')}`));
        return;
      }
      console.log(chalk.green(`✓ Switching to ${mode} mode...`));
    } else {
      console.log(chalk.cyan(`Current mode: ${config.mode}`));
      console.log(chalk.gray(`Available modes: ${validModes.join(', ')}`));
    }
  });

// Comando: provider
const providerCommand = program
  .command('provider')
  .description('Manage AI providers');

providerCommand
  .command('list')
  .description('List configured AI providers')
  .action(() => {
    console.log(chalk.cyan('Configured AI providers:\n'));
    
    const factory = createConnectorFactory();
    const connectors = factory.createAll(config);
    const defaultProvider = config.defaultProvider;
    
    for (const connector of connectors) {
      const name = connector.metadata.name;
      const isDefault = name === defaultProvider;
      const isEnabled = config.providers[name]?.enabled ?? false;
      const model = config.providers[name]?.model ?? 'default';
      
      const statusIcon = isEnabled ? chalk.green('●') : chalk.red('○');
      const defaultTag = isDefault ? chalk.yellow(' [default]') : '';
      
      console.log(`  ${statusIcon} ${chalk.bold(name)}${defaultTag}`);
      console.log(chalk.gray(`    Model: ${model}`));
      console.log(chalk.gray(`    Status: ${isEnabled ? 'enabled' : 'disabled'}`));
      console.log();
    }
  });

providerCommand
  .command('use <name>')
  .description('Set default AI provider')
  .action((name: string) => {
    const validProviders = ['copilot', 'claude', 'openai', 'local', 'custom'];
    
    if (!validProviders.includes(name)) {
      console.log(chalk.red(`Invalid provider: ${name}`));
      console.log(chalk.gray(`Valid providers: ${validProviders.join(', ')}`));
      return;
    }
    
    console.log(chalk.green(`✓ Switching default provider to ${name}...`));
  });

providerCommand
  .command('test [name]')
  .description('Test an AI provider')
  .option('-p, --prompt <text>', 'Test prompt', 'Say hello in exactly 3 words.')
  .action(async (name?: string, options?: { prompt?: string }) => {
    const providerName = name ?? config.defaultProvider;
    const testPrompt = options?.prompt ?? 'Say hello in exactly 3 words.';
    
    console.log(chalk.cyan(`Testing provider: ${providerName}`));
    console.log(chalk.gray(`Prompt: "${testPrompt}"\n`));
    
    try {
      const factory = createConnectorFactory();
      const providerConfig = config.providers[providerName as keyof typeof config.providers];
      
      if (!providerConfig || !providerConfig.enabled) {
        console.log(chalk.yellow(`Provider '${providerName}' is not enabled.`));
        return;
      }
      
      const connector = factory.create(providerName as any, providerConfig);
      const registry = createAIRegistry();
      registry.register(connector);
      
      const manager = createAIManager(registry);
      
      console.log(chalk.gray('Sending request...'));
      
      const response = await manager.complete({
        messages: [
          { role: 'user', content: testPrompt },
        ],
        maxTokens: 50,
      });
      
      console.log(chalk.green('✓ Response received:\n'));
      console.log(chalk.white(response.message.content));
      console.log();
      console.log(chalk.gray(`Model: ${response.model}`));
      console.log(chalk.gray(`Tokens: ${response.usage?.totalTokens ?? 'N/A'}`));
      console.log(chalk.gray(`Finish reason: ${response.finishReason}`));
      
    } catch (error) {
      console.log(chalk.red('✗ Test failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

// Comando: plugin
const pluginCommand = program
  .command('plugin')
  .description('Manage plugins');

pluginCommand
  .command('install <path>')
  .description('Install a plugin from a local path')
  .action(async (path: string) => {
    try {
      console.log(chalk.gray(`Installing plugin from ${path}...`));
      const plugin = await pluginManager.install(path);
      console.log(chalk.green(`✓ Plugin '${plugin.manifest.name}' v${plugin.manifest.version} installed`));
    } catch (error) {
      console.log(chalk.red('✗ Install failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(() => {
    const plugins = pluginManager.list();
    
    if (plugins.length === 0) {
      console.log(chalk.gray('No plugins installed.'));
      return;
    }
    
    console.log(chalk.cyan('Installed plugins:\n'));
    
    for (const plugin of plugins) {
      const statusIcon = plugin.status === 'enabled' ? chalk.green('●') : 
                         plugin.status === 'disabled' ? chalk.yellow('○') : chalk.red('○');
      
      console.log(`  ${statusIcon} ${chalk.bold(plugin.manifest.name)} v${plugin.manifest.version}`);
      console.log(chalk.gray(`    Status: ${plugin.status}`));
      console.log(chalk.gray(`    Type: ${plugin.manifest.type}`));
      console.log(chalk.gray(`    Path: ${plugin.path}`));
      console.log();
    }
  });

pluginCommand
  .command('enable <name>')
  .description('Enable a plugin')
  .action(async (name: string) => {
    try {
      await pluginManager.enable(name);
      console.log(chalk.green(`✓ Plugin '${name}' enabled`));
    } catch (error) {
      console.log(chalk.red('✗ Enable failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

pluginCommand
  .command('disable <name>')
  .description('Disable a plugin')
  .action(async (name: string) => {
    try {
      await pluginManager.disable(name);
      console.log(chalk.yellow(`✓ Plugin '${name}' disabled`));
    } catch (error) {
      console.log(chalk.red('✗ Disable failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

// Comando: skill
const skillCommand = program
  .command('skill')
  .description('Manage skills');

skillCommand
  .command('list')
  .description('List available skills')
  .option('-c, --category <category>', 'Filter by category')
  .action((options: { category?: string }) => {
    let skills = skillManager.list();
    
    if (options.category) {
      skills = skillManager.listByCategory(options.category as any);
    }
    
    if (skills.length === 0) {
      console.log(chalk.gray('No skills found.'));
      return;
    }
    
    console.log(chalk.cyan('Available skills:\n'));
    
    for (const skill of skills) {
      const statusIcon = skill.enabled ? chalk.green('●') : chalk.gray('○');
      
      console.log(`  ${statusIcon} ${chalk.bold(skill.definition.name)} v${skill.definition.version}`);
      console.log(chalk.gray(`    Category: ${skill.definition.category}`));
      console.log(chalk.gray(`    Status: ${skill.enabled ? 'enabled' : 'disabled'}`));
      if (skill.definition.templates) {
        console.log(chalk.gray(`    Templates: ${skill.definition.templates.map(t => t.name).join(', ')}`));
      }
      console.log();
    }
  });

skillCommand
  .command('enable <name>')
  .description('Enable a skill')
  .action((name: string) => {
    try {
      skillManager.enable(name);
      console.log(chalk.green(`✓ Skill '${name}' enabled`));
    } catch (error) {
      console.log(chalk.red('✗ Enable failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

skillCommand
  .command('disable <name>')
  .description('Disable a skill')
  .action((name: string) => {
    try {
      skillManager.disable(name);
      console.log(chalk.yellow(`✓ Skill '${name}' disabled`));
    } catch (error) {
      console.log(chalk.red('✗ Disable failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

// Comando: agent
const agentCommand = program
  .command('agent')
  .description('Manage and run AI agents');

agentCommand
  .command('list')
  .description('List available agents')
  .action(() => {
    console.log(chalk.cyan('Available agents:\n'));
    
    for (const [name, agent] of Object.entries(builtInAgents)) {
      console.log(`  ${chalk.bold(name)} v${agent.version}`);
      console.log(chalk.gray(`    ${agent.description}`));
      console.log(chalk.gray(`    Tools: ${agent.tools?.map(t => t.name).join(', ') ?? 'none'}`));
      console.log(chalk.gray(`    Max iterations: ${agent.maxIterations}`));
      console.log();
    }
  });

agentCommand
  .command('run <agent> <objective>')
  .description('Run an agent with an objective')
  .option('-p, --provider <name>', 'AI provider to use')
  .option('-m, --model <name>', 'Model to use')
  .action(async (agentName: string, objective: string, options: { provider?: string; model?: string }) => {
    const agent = builtInAgents[agentName];
    
    if (!agent) {
      console.log(chalk.red(`Unknown agent: ${agentName}`));
      console.log(chalk.gray(`Available agents: ${Object.keys(builtInAgents).join(', ')}`));
      return;
    }
    
    console.log(chalk.cyan(`Running agent: ${agent.name}`));
    console.log(chalk.gray(`Objective: ${objective}`));
    console.log(chalk.gray(`Provider: ${options.provider ?? config.defaultProvider}`));
    console.log();
    
    try {
      // Configurar AI
      const factory = createConnectorFactory();
      const providerName = options.provider ?? config.defaultProvider;
      const providerConfig = config.providers[providerName as keyof typeof config.providers];
      
      if (!providerConfig || !providerConfig.enabled) {
        console.log(chalk.red(`Provider '${providerName}' is not enabled.`));
        return;
      }
      
      if (options.model) {
        providerConfig.model = options.model;
      }
      
      const connector = factory.create(providerName as any, providerConfig);
      const registry = createAIRegistry();
      registry.register(connector);
      
      const aiManager = createAIManager(registry);
      
      // Tool executor simple (sin MCPs reales por ahora)
      const toolExecutor: ToolExecutor = {
        execute: async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
          console.log(chalk.blue(`  🔧 Tool: ${name}`), chalk.gray(JSON.stringify(args)));
          
          // Placeholder: simular ejecución de herramientas
          return {
            toolCallId: name,
            content: `Tool '${name}' executed successfully with args: ${JSON.stringify(args)}`,
          };
        },
        listTools: () => agent.tools ?? [],
      };
      
      // Ejecutar agente
      const result = await agentRunner.run(agent, objective, {
        session: {
          id: `cli_${Date.now()}`,
          project: process.cwd(),
          mode: config.mode,
          provider: providerName as any,
          startedAt: new Date(),
          mcpServers: [],
        },
        toolExecutor,
        aiManager,
        onEvent: (event) => {
          switch (event.type) {
            case 'step:start':
              console.log(chalk.gray(`  Step ${(event.data as any).iteration + 1}...`));
              break;
            case 'tool:start':
              console.log(chalk.blue(`  🔧 Executing tool...`));
              break;
            case 'tool:complete':
              const toolStep = event.data as any;
              console.log(chalk.green(`  ✓ Tool completed in ${toolStep.duration}ms`));
              break;
            case 'agent:error':
              console.log(chalk.red(`  ✗ Error: ${(event.data as any).error}`));
              break;
          }
        },
      });
      
      console.log();
      
      if (result.success) {
        console.log(chalk.green('✓ Agent completed successfully'));
        console.log(chalk.gray(`  Iterations: ${result.iterations}`));
        console.log(chalk.gray(`  Duration: ${(result.totalDuration / 1000).toFixed(1)}s`));
        console.log();
        console.log(chalk.white(result.finalMessage));
      } else {
        console.log(chalk.red('✗ Agent failed'));
        console.log(chalk.red(`  Error: ${result.error}`));
      }
      
    } catch (error) {
      console.log(chalk.red('✗ Agent execution failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

// Comando: mcp
const mcpCommand = program
  .command('mcp')
  .description('Manage MCP servers and clients');

mcpCommand
  .command('connect <name>')
  .description('Connect to an MCP server')
  .option('-u, --url <url>', 'Server URL')
  .option('-t, --type <type>', 'Connection type (stdio, sse)')
  .action(async (name: string, options: { url?: string; type?: string }) => {
    try {
      const client = createMCPClient({
        name,
        command: name,
        enabled: true,
        ...(options.url && { url: options.url }),
        ...(options.type && { type: options.type as any }),
      });
      
      console.log(chalk.gray(`Connecting to MCP server '${name}'...`));
      await client.connect();
      
      console.log(chalk.green(`✓ Connected to ${name}`));
      
      // Listar herramientas disponibles
      const tools = await client.listTools();
      if (tools.length > 0) {
        console.log(chalk.cyan('\nAvailable tools:'));
        for (const tool of tools) {
          console.log(`  ${chalk.bold(tool.name)}: ${tool.description}`);
        }
      }
      
      await client.disconnect();
      
    } catch (error) {
      console.log(chalk.red('✗ Connection failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

mcpCommand
  .command('start')
  .description('Start a local MCP server')
  .action(async () => {
    try {
      const server = createMCPServer();
      
      // Registrar algunas herramientas de ejemplo
      server.registerTool(
        {
          name: 'get_project_info',
          description: 'Get information about the current project',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        async () => {
          return {
            name: 'your-harness',
            version: config.version,
            mode: config.mode,
            cwd: process.cwd(),
          };
        }
      );
      
      server.registerTool(
        {
          name: 'echo',
          description: 'Echoes back the input message',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to echo',
              },
            },
            required: ['message'],
          },
        },
        async (args) => {
          return { echoed: args.message };
        }
      );
      
      console.log(chalk.cyan('Starting MCP server...'));
      await server.start();
      
      console.log(chalk.green('✓ MCP server is running'));
      console.log(chalk.gray('Send JSON-RPC requests via stdin. Press Ctrl+C to stop.'));
      
      // Mantener el proceso vivo
      process.on('SIGINT', async () => {
        console.log();
        await server.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.log(chalk.red('✗ Server start failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

mcpCommand
  .command('status')
  .description('Show MCP connection status')
  .action(() => {
    console.log(chalk.cyan('MCP Status:\n'));
    
    const configuredServers = config.mcpServers ?? [];
    
    if (configuredServers.length === 0) {
      console.log(chalk.gray('No MCP servers configured.'));
      console.log(chalk.gray('Add servers in ~/.your-harness/config.yml'));
      return;
    }
    
    for (const server of configuredServers) {
      const statusIcon = server.enabled ? chalk.green('●') : chalk.red('○');
      console.log(`  ${statusIcon} ${chalk.bold(server.name)}`);
      console.log(chalk.gray(`    Command: ${server.command}`));
      console.log(chalk.gray(`    Status: ${server.enabled ? 'configured' : 'disabled'}`));
      console.log();
    }
  });

// Parsear argumentos
program.parse(process.argv);

// Mostrar ayuda si no hay argumentos
if (!process.argv.slice(2).length) {
  program.outputHelp();
}