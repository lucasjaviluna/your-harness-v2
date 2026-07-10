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

const config = loadConfig();
const logger = createLogger(config.logLevel);

// Inicializar managers
const pluginLoader = createPluginLoader();
const pluginManager = createPluginManager(pluginLoader);
const skillManager = createSkillManager();

// Registrar skills built-in
skillManager.register(codeReviewSkill);

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

// Parsear argumentos
program.parse(process.argv);

// Mostrar ayuda si no hay argumentos
if (!process.argv.slice(2).length) {
  program.outputHelp();
}