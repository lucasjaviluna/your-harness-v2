import type { MCPConnector } from './connector.js';

export interface MCPRegistry {
  register(connector: MCPConnector): void;
  unregister(name: string): void;
  get(name: string): MCPConnector | undefined;
  list(): MCPConnector[];
  listConnected(): MCPConnector[];
}

export const createMCPRegistry = (): MCPRegistry => {
  const connectors = new Map<string, MCPConnector>();

  return {
    register: (connector) => {
      connectors.set(connector.metadata.name, connector);
    },

    unregister: (name) => {
      connectors.delete(name);
    },

    get: (name) => connectors.get(name),

    list: () => Array.from(connectors.values()),

    listConnected: () => Array.from(connectors.values()).filter(c => c.isConnected()),
  };
};