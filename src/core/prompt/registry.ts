import type { PromptFragment, PromptBuilder, PromptContext } from './builder.js';

export interface PromptRegistry {
  /** Registra un fragmento con un ID y opcionalmente un modo asociado */
  register(id: string, fragment: PromptFragment, mode?: string): void;
  
  /** Elimina un fragmento */
  unregister(id: string): void;
  
  /** Obtiene los fragmentos aplicables según el contexto (modo, etc.) */
  getFragments(context?: PromptContext): Array<{ id: string; fragment: PromptFragment }>;
  
  /** Aplica todos los fragmentos relevantes a un builder */
  applyTo(builder: PromptBuilder, context?: PromptContext): void;
}

interface RegistryEntry {
  fragment: PromptFragment;
  mode?: string;
}

export const createPromptRegistry = (): PromptRegistry => {
  const entries = new Map<string, RegistryEntry>();

  return {
    register(id, fragment, mode) {
      entries.set(id, { fragment, mode });
    },

    unregister(id) {
      entries.delete(id);
    },

    getFragments(context = {}) {
      const result: Array<{ id: string; fragment: PromptFragment }> = [];
      for (const [id, entry] of entries) {
        // Si tiene modo asociado, solo se incluye si coincide con el contexto
        if (entry.mode && context.mode && entry.mode !== context.mode) {
          continue;
        }
        result.push({ id, fragment: entry.fragment });
      }
      return result;
    },

    applyTo(builder, context) {
      const fragments = this.getFragments(context);
      for (const { id, fragment } of fragments) {
        builder.addFragment(id, fragment);
      }
    },
  };
};