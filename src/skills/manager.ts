import type { SkillDefinition, SkillInstance, SkillContext, SkillExecutionResult, SkillCategory } from './types.js';
import type { PromptBuilder } from '../../core/prompt/builder.js';

export interface SkillManager {
  /** Registra una nueva skill */
  register(definition: SkillDefinition): void;
  
  /** Elimina una skill registrada */
  unregister(name: string): void;
  
  /** Habilita una skill para la sesión actual */
  enable(name: string): void;
  
  /** Deshabilita una skill */
  disable(name: string): void;
  
  /** Lista todas las skills registradas */
  list(): SkillInstance[];
  
  /** Lista skills por categoría */
  listByCategory(category: SkillCategory): SkillInstance[];
  
  /** Obtiene una skill por nombre */
  get(name: string): SkillInstance | undefined;
  
  /** Inyecta los system prompts de las skills activas en el builder */
  injectPrompts(builder: PromptBuilder, context: SkillContext): void;
  
  /** Obtiene todas las tools de las skills activas */
  getActiveTools(): { name: string; definition: SkillDefinition['tools'] }[];
  
  /** Ejecuta un template de una skill */
  executeTemplate(skillName: string, templateName: string, variables?: Record<string, string>): Promise<SkillExecutionResult>;
  
  /** Construye el contexto actual de skills */
  getContext(mode: string, project?: string): SkillContext;
}

export const createSkillManager = (): SkillManager => {
  const skills = new Map<string, SkillInstance>();

  return {
    register(definition) {
      if (skills.has(definition.name)) {
        throw new Error(`Skill '${definition.name}' is already registered`);
      }

      // Validar dependencias
      if (definition.requires) {
        for (const req of definition.requires) {
          if (!skills.has(req)) {
            throw new Error(`Skill '${definition.name}' requires '${req}' which is not registered`);
          }
        }
      }

      skills.set(definition.name, {
        definition,
        enabled: false,
        loadedAt: new Date(),
        usageCount: 0,
      });
    },

    unregister(name) {
      // Verificar que ninguna otra skill dependa de esta
      for (const [, instance] of skills) {
        if (instance.definition.requires?.includes(name)) {
          throw new Error(`Cannot unregister '${name}': required by '${instance.definition.name}'`);
        }
      }
      skills.delete(name);
    },

    enable(name) {
      const instance = skills.get(name);
      if (!instance) {
        throw new Error(`Skill '${name}' not found`);
      }

      // Habilitar dependencias primero
      if (instance.definition.requires) {
        for (const req of instance.definition.requires) {
          this.enable(req);
        }
      }

      instance.enabled = true;
    },

    disable(name) {
      const instance = skills.get(name);
      if (!instance) {
        throw new Error(`Skill '${name}' not found`);
      }

      // Verificar que ninguna skill habilitada dependa de esta
      for (const [, other] of skills) {
        if (other.enabled && other.definition.requires?.includes(name)) {
          throw new Error(`Cannot disable '${name}': required by enabled skill '${other.definition.name}'`);
        }
      }

      instance.enabled = false;
    },

    list() {
      return Array.from(skills.values());
    },

    listByCategory(category) {
      return Array.from(skills.values())
        .filter(s => s.definition.category === category);
    },

    get(name) {
      return skills.get(name);
    },

    injectPrompts(builder, context) {
      const activeSkills = context.availableSkills.filter(s => s.enabled);
      
      for (const skill of activeSkills) {
        if (skill.definition.systemPrompt) {
          builder.addFragment(
            `skill:${skill.definition.name}`,
            `[Skill: ${skill.definition.name}]\n${skill.definition.systemPrompt}`
          );
        }
      }
    },

    getActiveTools() {
      const tools: { name: string; definition: SkillDefinition['tools'] }[] = [];
      
      for (const [, instance] of skills) {
        if (instance.enabled && instance.definition.tools) {
          tools.push({
            name: instance.definition.name,
            definition: instance.definition.tools,
          });
        }
      }
      
      return tools;
    },

    async executeTemplate(skillName, templateName, variables = {}) {
      const startTime = Date.now();
      const instance = skills.get(skillName);
      
      if (!instance) {
        return {
          skillName,
          success: false,
          messages: [],
          error: `Skill '${skillName}' not found`,
          duration: Date.now() - startTime,
        };
      }

      const template = instance.definition.templates?.find(t => t.name === templateName);
      if (!template) {
        return {
          skillName,
          success: false,
          messages: [],
          error: `Template '${templateName}' not found in skill '${skillName}'`,
          duration: Date.now() - startTime,
        };
      }

      // Reemplazar variables en los mensajes
      const messages = template.messages.map(msg => ({
        ...msg,
        content: replaceVariables(msg.content, variables),
      }));

      instance.usageCount++;

      return {
        skillName,
        success: true,
        messages,
        duration: Date.now() - startTime,
      };
    },

    getContext(mode, project) {
      return {
        availableSkills: Array.from(skills.values()),
        mode,
        project,
        config: {},
      };
    },
  };
};

const replaceVariables = (content: string, variables: Record<string, string>): string => {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
};