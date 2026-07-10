import type { BaseConnector, ConnectorMetadata } from '../connector.js';
import type { 
  MCPServerConfig, 
  MCPToolDefinition, 
  MCPPromptDefinition, 
  MCPResourceDefinition 
} from './types.js';

export interface MCPConnector extends BaseConnector {
  readonly metadata: ConnectorMetadata & { type: 'mcp' };
  
  /** Descubre las herramientas disponibles */
  listTools(): Promise<MCPToolDefinition[]>;
  
  /** Descubre los prompts disponibles */
  listPrompts(): Promise<MCPPromptDefinition[]>;
  
  /** Descubre los recursos disponibles */
  listResources(): Promise<MCPResourceDefinition[]>;
  
  /** Ejecuta una herramienta */
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  
  /** Obtiene un recurso */
  readResource(uri: string): Promise<string>;
}

// Factory funcional
export const createMCPConnector = (
  metadata: Omit<ConnectorMetadata, 'type'>,
  config: MCPServerConfig,
  implementation: {
    listTools?: () => Promise<MCPToolDefinition[]>;
    listPrompts?: () => Promise<MCPPromptDefinition[]>;
    listResources?: () => Promise<MCPResourceDefinition[]>;
    callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    readResource?: (uri: string) => Promise<string>;
  }
): MCPConnector => {
  let connected = false;

  return {
    metadata: { ...metadata, type: 'mcp' },
    
    connect: async () => {
      // Lógica de conexión (por ahora solo marca estado)
      connected = true;
    },
    
    disconnect: async () => {
      connected = false;
    },
    
    getState: () => ({
      status: connected ? 'connected' : 'disconnected',
    }),
    
    isConnected: () => connected,
    
    listTools: async () => implementation.listTools?.() ?? [],
    listPrompts: async () => implementation.listPrompts?.() ?? [],
    listResources: async () => implementation.listResources?.() ?? [],
    callTool: async (name, args) => {
      if (!implementation.callTool) throw new Error('Tool call not implemented');
      return implementation.callTool(name, args);
    },
    readResource: async (uri) => {
      if (!implementation.readResource) throw new Error('Read resource not implemented');
      return implementation.readResource(uri);
    },
  };
};