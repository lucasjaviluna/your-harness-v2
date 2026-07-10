import type { Message, ToolCall, ToolResult, ToolDefinition } from '../core/ai/types.js';
import type { SessionContext } from '../types/index.js';

export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'waiting' | 'completed' | 'error';

export interface AgentDefinition {
  name: string;
  description: string;
  version: string;
  
  /** System prompt base del agente */
  systemPrompt: string;
  
  /** Herramientas disponibles para el agente */
  tools?: ToolDefinition[];
  
  /** Máximo de iteraciones del loop de razonamiento */
  maxIterations?: number;
  
  /** Temperatura por defecto */
  temperature?: number;
  
  /** Modelo preferido (opcional) */
  preferredModel?: string;
}

export interface AgentStep {
  id: string;
  iteration: number;
  type: 'thought' | 'action' | 'observation' | 'response';
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  timestamp: Date;
  duration: number;
}

export interface AgentContext {
  session: SessionContext;
  definition: AgentDefinition;
  steps: AgentStep[];
  status: AgentStatus;
  messages: Message[];
  startedAt: Date;
  toolsAvailable: ToolDefinition[];
}

export interface AgentResult {
  success: boolean;
  finalMessage: string;
  steps: AgentStep[];
  totalDuration: number;
  iterations: number;
  error?: string;
}

export interface ToolExecutor {
  /** Ejecuta una herramienta por nombre y argumentos */
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  
  /** Lista las herramientas disponibles */
  listTools(): ToolDefinition[];
}

export type AgentEventCallback = (event: AgentEvent) => void | Promise<void>;

export interface AgentEvent {
  type: 'step:start' | 'step:complete' | 'tool:start' | 'tool:complete' | 'agent:complete' | 'agent:error';
  agentName: string;
  data: unknown;
  timestamp: Date;
}