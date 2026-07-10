// Plugin de ejemplo: Hello World
// Demuestra la estructura mínima de un plugin para your-harness

import type { PluginHook, PluginContext } from '../types.js';

// Hook ejecutado al instalar el plugin
export const onInstall = async (context: PluginContext): Promise<void> => {
  console.log('[hello-world] Installed successfully');
  console.log(`[hello-world] Active plugins: ${context.plugins.map(p => p.manifest.name).join(', ')}`);
};

// Hook ejecutado al habilitar el plugin
export const onEnable = async (context: PluginContext): Promise<void> => {
  console.log('[hello-world] Enabled');
};

// Hook ejecutado al deshabilitar el plugin
export const onDisable = async (context: PluginContext): Promise<void> => {
  console.log('[hello-world] Disabled');
};

// Hook ejecutado al desinstalar el plugin
export const onUninstall = async (context: PluginContext): Promise<void> => {
  console.log('[hello-world] Uninstalled. Goodbye!');
};

// Comando exportado que puede ser invocado desde el CLI
export const greet = async (name?: string): Promise<string> => {
  const target = name ?? 'Developer';
  return `Hello, ${target}! Welcome to your-harness.`;
};

// Tool exportada que puede ser usada por agentes
export const tools = {
  hello_world: {
    name: 'hello_world',
    description: 'A simple greeting tool - demonstrates plugin tool structure',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet',
        },
      },
    },
    execute: async (args: { name?: string }) => {
      return { message: `Hello, ${args.name ?? 'World'}!` };
    },
  },
};

// Metadatos del plugin (también en plugin.json)
export const manifest = {
  name: 'hello-world',
  version: '0.1.0',
  description: 'A simple hello-world plugin for your-harness',
  author: 'your-harness',
  type: 'tool' as const,
  commands: [
    {
      name: 'greet',
      description: 'Greet someone',
      action: 'greet',
    },
  ],
  skills: [],
};

// Satisfacer PluginHook type
const hooks: PluginHook = {
  onInstall,
  onEnable,
  onDisable,
  onUninstall,
};

export default hooks;