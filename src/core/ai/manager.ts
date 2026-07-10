import type { AIRegistry } from './registry.js';
import type { AIConnector } from './connector.js';
import type { CompletionRequest, CompletionResponse, StreamChunk } from './types.js';

export interface AIManager {
  /** Ejecuta una solicitud de completion usando el provider especificado o el default */
  complete(request: CompletionRequest, providerName?: string): Promise<CompletionResponse>;
  
  /** Streaming de respuestas */
  stream(request: CompletionRequest, providerName?: string): AsyncIterable<StreamChunk>;
  
  /** Cambia el provider por defecto */
  setDefaultProvider(name: string): void;
  
  /** Obtiene el nombre del provider por defecto */
  getDefaultProvider(): string;
  
  /** Lista los nombres de providers disponibles */
  listProviders(): string[];
  
  /** Fuerza la conexión de un provider */
  connect(name: string): Promise<void>;
}

const resolveConnector = (registry: AIRegistry, name?: string): AIConnector => {
  const connector = name ? registry.get(name) : registry.getDefault();
  if (!connector) {
    throw new Error(`AI provider '${name || 'default'}' not found`);
  }
  return connector;
};

export const createAIManager = (registry: AIRegistry): AIManager => {
  return {
    async complete(request, providerName) {
      const connector = resolveConnector(registry, providerName);
      
      if (!connector.isConnected()) {
        await connector.connect();
      }
      
      try {
        return await connector.complete(request);
      } catch (error) {
        // Fallback simple: si hay error y especificaron provider, intentar default
        const defaultConnector = registry.getDefault();
        if (defaultConnector && connector !== defaultConnector) {
          if (!defaultConnector.isConnected()) {
            await defaultConnector.connect();
          }
          return defaultConnector.complete(request);
        }
        throw error;
      }
    },

    async *stream(request, providerName) {
      const connector = resolveConnector(registry, providerName);
      
      if (!connector.isConnected()) {
        await connector.connect();
      }
      
      if (!connector.stream) {
        throw new Error(`Provider '${connector.metadata.name}' does not support streaming`);
      }
      
      try {
        for await (const chunk of connector.stream(request)) {
          yield chunk;
        }
      } catch (error) {
        const defaultConnector = registry.getDefault();
        if (defaultConnector && connector !== defaultConnector && defaultConnector.stream) {
          for await (const chunk of defaultConnector.stream(request)) {
            yield chunk;
          }
          return;
        }
        throw error;
      }
    },

    setDefaultProvider(name) {
      registry.setDefault(name);
    },

    getDefaultProvider() {
      return registry.getDefault()?.metadata.name ?? '';
    },

    listProviders() {
      return registry.list().map(c => c.metadata.name);
    },

    async connect(name) {
      const connector = registry.get(name);
      if (connector) {
        await connector.connect();
      }
    },
  };
};