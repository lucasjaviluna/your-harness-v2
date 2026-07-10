import type { Message } from '../ai/types.js';

export type PromptFragment = string | ((context: PromptContext) => string);

export interface PromptContext {
  mode?: string;
  project?: string;
  task?: string;
  tools?: string[];         // Nombres de herramientas disponibles
  mcpServers?: string[];    // Servidores MCP conectados
  custom?: Record<string, unknown>;
}

export interface PromptBuilder {
  /** Agrega un fragmento de prompt con un identificador */
  addFragment(id: string, fragment: PromptFragment): void;
  
  /** Elimina un fragmento */
  removeFragment(id: string): void;
  
  /** Construye el system prompt completo */
  build(context?: PromptContext): Message;
  
  /** Construye solo el texto */
  buildText(context?: PromptContext): string;
}

const resolveFragment = (fragment: PromptFragment, context: PromptContext): string =>
  typeof fragment === 'function' ? fragment(context) : fragment;

export const createPromptBuilder = (basePrompt?: string): PromptBuilder => {
  const fragments = new Map<string, PromptFragment>();
  
  if (basePrompt) {
    fragments.set('base', basePrompt);
  }

  return {
    addFragment(id, fragment) {
      fragments.set(id, fragment);
    },

    removeFragment(id) {
      fragments.delete(id);
    },

    buildText(context = {}) {
      const parts: string[] = [];
      
      for (const [, fragment] of fragments) {
        const resolved = resolveFragment(fragment, context);
        if (resolved.trim()) {
          parts.push(resolved.trim());
        }
      }
      
      return parts.join('\n\n');
    },

    build(context = {}) {
      return {
        role: 'system' as const,
        content: this.buildText(context),
      };
    },
  };
};