import type { AIManager } from './ai/manager.js';
import type { MCPManager } from './mcp/manager.js';
import type { PromptBuilder } from './prompt/builder.js';
import type { ContextManager } from './context.js';
import type { EventBus } from './events.js';
import type { SessionContext, ModeType, ProviderType } from '../types/index.js';
import type { CompletionRequest, CompletionResponse, StreamChunk } from './ai/types.js';
import type { MCPToolDefinition } from './mcp/types.js';

export interface Harness {
  // Inicialización
  initialize(): Promise<void>;
  
  // Sesiones
  createSession(project: string, options?: {
    mode?: ModeType;
    provider?: ProviderType;
    mcpServers?: string[];
  }): SessionContext;
  
  getSession(id: string): SessionContext | undefined;
  endSession(id: string): void;
  
  // AI
  complete(sessionId: string, userMessage: string, options?: {
    provider?: string;
    includeTools?: boolean;
  }): Promise<CompletionResponse>;
  
  stream(sessionId: string, userMessage: string, options?: {
    provider?: string;
    includeTools?: boolean;
  }): AsyncIterable<StreamChunk>;
  
  // MCP
  getMCPManager(): MCPManager;
  
  // Prompt
  getPromptBuilder(): PromptBuilder;
  
  // Eventos
  getEventBus(): EventBus;
  
  // Shutdown
  shutdown(): Promise<void>;
}

const mergeTools = (existing: Record<string, unknown>[], mcpTools: MCPToolDefinition[]): Record<string, unknown>[] => {
  const toolNames = new Set(existing.map(t => t.name));
  const newTools = mcpTools
    .filter(t => !toolNames.has(t.name))
    .map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    }));
  return [...existing, ...newTools];
};

export const createHarness = (
  aiManager: AIManager,
  mcpManager: MCPManager,
  promptBuilder: PromptBuilder,
  contextManager: ContextManager,
  eventBus: EventBus
): Harness => {
  let initialized = false;

  return {
    async initialize() {
      if (initialized) return;
      
      await eventBus.emit('harness:initializing', {});
      
      // Conectar MCP servers configurados
      const mcpStatus = mcpManager.status();
      for (const server of mcpStatus) {
        try {
          await mcpManager.connect(server.name);
          await eventBus.emit('mcp:connected', { name: server.name });
        } catch (error) {
          await eventBus.emit('mcp:error', { name: server.name, error });
        }
      }
      
      initialized = true;
      await eventBus.emit('harness:initialized', {});
    },

    createSession(project, options = {}) {
      const session = contextManager.createSession(project, options);
      eventBus.emit('session:created', session);
      return session;
    },

    getSession(id) {
      return contextManager.getSession(id);
    },

    endSession(id) {
      contextManager.endSession(id);
      eventBus.emit('session:ended', { id });
    },

    async complete(sessionId, userMessage, options = {}) {
      if (!initialized) await this.initialize();

      const session = contextManager.getSession(sessionId);
      if (!session) throw new Error(`Session '${sessionId}' not found`);

      // Construir system prompt con contexto de sesión
      const systemPrompt = promptBuilder.build({
        mode: session.mode,
        project: session.project,
        mcpServers: session.mcpServers,
      });

      // Obtener herramientas MCP si se solicitan
      let tools: Record<string, unknown>[] | undefined;
      if (options.includeTools && session.mcpServers.length > 0) {
        const mcpTools = await mcpManager.listTools();
        const allTools = Object.values(mcpTools).flat();
        tools = allTools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        }));
      }

      const request: CompletionRequest = {
        messages: [
          systemPrompt,
          { role: 'user', content: userMessage },
        ],
        tools,
      };

      await eventBus.emit('ai:completing', { sessionId, request });
      const response = await aiManager.complete(request, options.provider);
      await eventBus.emit('ai:completed', { sessionId, response });

      return response;
    },

    async *stream(sessionId, userMessage, options = {}) {
      if (!initialized) await this.initialize();

      const session = contextManager.getSession(sessionId);
      if (!session) throw new Error(`Session '${sessionId}' not found`);

      const systemPrompt = promptBuilder.build({
        mode: session.mode,
        project: session.project,
        mcpServers: session.mcpServers,
      });

      const request: CompletionRequest = {
        messages: [
          systemPrompt,
          { role: 'user', content: userMessage },
        ],
      };

      await eventBus.emit('ai:streaming', { sessionId, request });
      
      for await (const chunk of aiManager.stream(request, options.provider)) {
        yield chunk;
      }

      await eventBus.emit('ai:stream-complete', { sessionId });
    },

    getMCPManager: () => mcpManager,
    getPromptBuilder: () => promptBuilder,
    getEventBus: () => eventBus,

    async shutdown() {
      await eventBus.emit('harness:shutting-down', {});
      
      const mcpStatus = mcpManager.status();
      for (const server of mcpStatus) {
        if (server.connected) {
          await mcpManager.disconnect(server.name);
        }
      }
      
      initialized = false;
      await eventBus.emit('harness:shutdown', {});
    },
  };
};