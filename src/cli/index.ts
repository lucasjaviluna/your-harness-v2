#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

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
    console.log(chalk.gray(`Config: ${config.mode} mode`));
  });

// Comando: config (placeholder)
program
  .command('config')
  .description('Manage configuration')
  .action(() => {
    console.log(chalk.yellow('Config command coming soon...'));
    console.log(chalk.gray(JSON.stringify(config, null, 2)));
  });

// Comando: mode (placeholder)
program
  .command('mode')
  .description('Set working mode')
  .argument('[mode]', 'Mode to activate')
  .action((mode?: string) => {
    if (mode) {
      console.log(chalk.green(`Switching to ${mode} mode...`));
    } else {
      console.log(chalk.cyan(`Current mode: ${config.mode}`));
      console.log(chalk.gray('Available modes: frontend, backend, devops, testing, analysis, custom'));
    }
  });

// Parsear argumentos
program.parse(process.argv);

// Mostrar ayuda si no hay argumentos
if (!process.argv.slice(2).length) {
  program.outputHelp();
}