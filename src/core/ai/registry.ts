import type { AIConnector } from './connector.js';

export interface AIRegistry {
  register(connector: AIConnector): void;
  unregister(name: string): void;
  get(name: string): AIConnector | undefined;
  list(): AIConnector[];
  getDefault(): AIConnector | undefined;
  setDefault(name: string): void;
}

export const createAIRegistry = (): AIRegistry => {
  const connectors = new Map<string, AIConnector>();
  let defaultName: string | undefined;

  return {
    register: (connector) => {
      connectors.set(connector.metadata.name, connector);
      if (!defaultName) {
        defaultName = connector.metadata.name;
      }
    },

    unregister: (name) => {
      connectors.delete(name);
      if (defaultName === name) {
        defaultName = connectors.keys().next().value;
      }
    },

    get: (name) => connectors.get(name),

    list: () => Array.from(connectors.values()),

    getDefault: () => defaultName ? connectors.get(defaultName) : undefined,

    setDefault: (name) => {
      if (connectors.has(name)) {
        defaultName = name;
      }
    },
  };
};