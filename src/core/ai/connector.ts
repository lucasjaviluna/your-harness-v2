import type { BaseConnector, ConnectorMetadata } from '../connector.js';
import type { CompletionRequest, CompletionResponse, StreamChunk, AIProvider } from './types.js';

export interface AIConnector extends BaseConnector {
  readonly metadata: ConnectorMetadata & { type: 'ai' };
  
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream?(request: CompletionRequest): AsyncIterable<StreamChunk>;
  listModels?(): Promise<string[]>;
  
  // Provider subyacente (opcional, para acceso directo)
  getProvider?(): AIProvider;
}

// Factory funcional
export const createAIConnector = (
  metadata: Omit<ConnectorMetadata, 'type'>,
  provider: AIProvider,
  options?: { supportsStream?: boolean; listModels?: () => Promise<string[]> }
): AIConnector => {
  let connected = false;
  
  return {
    metadata: { ...metadata, type: 'ai' },
    
    connect: async () => {
      // Lógica de conexión (validar API key, etc.)
      connected = true;
    },
    
    disconnect: async () => {
      connected = false;
    },
    
    getState: () => ({
      status: connected ? 'connected' : 'disconnected',
    }),
    
    isConnected: () => connected,
    
    complete: provider,
    
    stream: options?.supportsStream ? provider.stream : undefined,
    
    listModels: options?.listModels ?? provider.listModels,
    
    getProvider: () => provider,
  };
};