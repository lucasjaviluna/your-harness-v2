import type { MCPRegistry } from './registry.js';
import type { MCPConnector } from './connector.js';
import type { MCPToolDefinition, MCPPromptDefinition, MCPResourceDefinition } from './types.js';

export interface MCPManager {
  /** Conecta un servidor MCP por nombre */
  connect(name: string): Promise<void>;
  
  /** Desconecta un servidor MCP */
  disconnect(name: string): Promise<void>;
  
  /** Lista herramientas de uno o todos los servidores conectados */
  listTools(serverName?: string): Promise<Record<string, MCPToolDefinition[]>>;
  
  /** Lista prompts de uno o todos los servidores conectados */
  listPrompts(serverName?: string): Promise<Record<string, MCPPromptDefinition[]>>;
  
  /** Lista recursos de uno o todos los servidores conectados */
  listResources(serverName?: string): Promise<Record<string, MCPResourceDefinition[]>>;
  
  /** Ejecuta una herramienta en un servidor específico */
  callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
  
  /** Obtiene un recurso de un servidor */
  readResource(serverName: string, uri: string): Promise<string>;
  
  /** Lista los servidores registrados con su estado */
  status(): Array<{ name: string; connected: boolean }>;
}

const ensureConnected = async (connector: MCPConnector): Promise<void> => {
  if (!connector.isConnected()) {
    await connector.connect();
  }
};

const getConnector = (registry: MCPRegistry, name: string): MCPConnector => {
  const connector = registry.get(name);
  if (!connector) {
    throw new Error(`MCP server '${name}' not found`);
  }
  return connector;
};

const getAllConnected = (registry: MCPRegistry): MCPConnector[] =>
  registry.listConnected();

export const createMCPManager = (registry: MCPRegistry): MCPManager => {
  return {
    async connect(name) {
      const connector = getConnector(registry, name);
      await connector.connect();
    },

    async disconnect(name) {
      const connector = getConnector(registry, name);
      await connector.disconnect();
    },

    async listTools(serverName?) {
      if (serverName) {
        const connector = getConnector(registry, serverName);
        await ensureConnected(connector);
        return { [serverName]: await connector.listTools() };
      }
      
      const result: Record<string, MCPToolDefinition[]> = {};
      for (const connector of getAllConnected(registry)) {
        result[connector.metadata.name] = await connector.listTools();
      }
      return result;
    },

    async listPrompts(serverName?) {
      if (serverName) {
        const connector = getConnector(registry, serverName);
        await ensureConnected(connector);
        return { [serverName]: await connector.listPrompts() };
      }
      
      const result: Record<string, MCPPromptDefinition[]> = {};
      for (const connector of getAllConnected(registry)) {
        result[connector.metadata.name] = await connector.listPrompts();
      }
      return result;
    },

    async listResources(serverName?) {
      if (serverName) {
        const connector = getConnector(registry, serverName);
        await ensureConnected(connector);
        return { [serverName]: await connector.listResources() };
      }
      
      const result: Record<string, MCPResourceDefinition[]> = {};
      for (const connector of getAllConnected(registry)) {
        result[connector.metadata.name] = await connector.listResources();
      }
      return result;
    },

    async callTool(serverName, toolName, args) {
      const connector = getConnector(registry, serverName);
      await ensureConnected(connector);
      return connector.callTool(toolName, args);
    },

    async readResource(serverName, uri) {
      const connector = getConnector(registry, serverName);
      await ensureConnected(connector);
      return connector.readResource(uri);
    },

    status() {
      return registry.list().map(connector => ({
        name: connector.metadata.name,
        connected: connector.isConnected(),
      }));
    },
  };
};