import type { AgentDefinition } from '../agents/types.js';
import type { SkillDefinition } from '../skills/types.js';
import type { SessionContext } from '../types/index.js';

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type StepType = 
  | 'agent'        // Ejecutar un agente
  | 'skill'        // Ejecutar una skill
  | 'command'      // Ejecutar un comando shell
  | 'script'       // Ejecutar un script inline
  | 'parallel'     // Ejecutar steps en paralelo
  | 'condition'    // Branching condicional
  | 'wait'         // Esperar confirmación
  | 'transform';   // Transformar datos entre steps

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  description?: string;
  
  // Configuración según tipo
  config: AgentStepConfig | SkillStepConfig | CommandStepConfig | 
          ScriptStepConfig | ParallelStepConfig | ConditionStepConfig |
          WaitStepConfig | TransformStepConfig;
  
  // Dependencias (IDs de steps que deben completarse antes)
  dependsOn?: string[];
  
  // Condición para ejecutar este step
  condition?: string;
  
  // Timeout en segundos
  timeout?: number;
  
  // Reintentos
  retryCount?: number;
  retryDelay?: number;
}

export interface AgentStepConfig {
  type: 'agent';
  agent: string;                    // Nombre del agente
  objective: string;                // Objetivo o template
  variables?: Record<string, string>;
  provider?: string;
}

export interface SkillStepConfig {
  type: 'skill';
  skill: string;                    // Nombre de la skill
  template?: string;                // Template a usar
  variables?: Record<string, string>;
}

export interface CommandStepConfig {
  type: 'command';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  captureOutput?: boolean;
}

export interface ScriptStepConfig {
  type: 'script';
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  code: string;
  timeout?: number;
}

export interface ParallelStepConfig {
  type: 'parallel';
  steps: WorkflowStep[];
  failFast?: boolean;              // Cancelar todas si una falla
  maxConcurrency?: number;
}

export interface ConditionStepConfig {
  type: 'condition';
  branches: ConditionBranch[];
  default?: WorkflowStep[];
}

export interface ConditionBranch {
  condition: string;                // Expresión a evaluar
  steps: WorkflowStep[];
}

export interface WaitStepConfig {
  type: 'wait';
  message: string;
  timeout?: number;                 // Timeout de espera
  defaultChoice?: string;
}

export interface TransformStepConfig {
  type: 'transform';
  input: string;                    // Referencia a output de otro step ($stepId.output)
  transformer: string;              // Función transformadora
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  description: string;
  
  /** Steps del workflow */
  steps: WorkflowStep[];
  
  /** Variables globales */
  variables?: Record<string, string>;
  
  /** Triggers que inician el workflow */
  triggers?: WorkflowTrigger[];
  
  /** Configuración global */
  config?: {
    maxDuration?: number;           // Duración máxima en segundos
    notifyOnComplete?: boolean;
    storeResults?: boolean;
  };
}

export interface WorkflowTrigger {
  type: 'manual' | 'file-change' | 'schedule' | 'webhook' | 'git-hook';
  config?: Record<string, unknown>;
}

export interface WorkflowContext {
  workflow: WorkflowDefinition;
  session: SessionContext;
  variables: Record<string, string>;
  stepResults: Map<string, StepResult>;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  retries: number;
}

export interface WorkflowResult {
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
  error?: string;
  outputs: Record<string, unknown>;
}

export type WorkflowEventCallback = (event: WorkflowEvent) => void | Promise<void>;

export interface WorkflowEvent {
  type: 'workflow:start' | 'workflow:complete' | 'workflow:error' |
        'step:start' | 'step:complete' | 'step:error' | 'step:skip';
  workflowName: string;
  stepId?: string;
  data: unknown;
  timestamp: Date;
}