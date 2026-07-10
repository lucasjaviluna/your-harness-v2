import type { Message, ToolDefinition } from '../../core/ai/types.js';

export type SkillCategory = 
  | 'code-generation'
  | 'code-review'
  | 'refactoring'
  | 'testing'
  | 'documentation'
  | 'devops'
  | 'analysis'
  | 'custom';

export interface SkillDefinition {
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  
  /** Instrucciones de sistema que se inyectan al usar la skill */
  systemPrompt?: string;
  
  /** Herramientas que la skill requiere o provee */
  tools?: ToolDefinition[];
  
  /** Template de mensajes predefinidos */
  templates?: SkillTemplate[];
  
  /** Skills requeridas como dependencia */
  requires?: string[];
  
  /** Configuración por defecto */
  config?: Record<string, unknown>;
}

export interface SkillTemplate {
  name: string;
  description: string;
  messages: Message[];
  variables?: string[]; // Variables que el usuario debe proporcionar
}

export interface SkillInstance {
  definition: SkillDefinition;
  enabled: boolean;
  loadedAt: Date;
  usageCount: number;
}

export interface SkillContext {
  /** Skills disponibles en la sesión actual */
  availableSkills: SkillInstance[];
  
  /** Modo de trabajo actual */
  mode: string;
  
  /** Proyecto actual */
  project?: string;
  
  /** Configuración combinada de las skills activas */
  config: Record<string, unknown>;
}

export interface SkillExecutionResult {
  skillName: string;
  success: boolean;
  messages: Message[];
  toolsCalled?: string[];
  error?: string;
  duration: number; // ms
}