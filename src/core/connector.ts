// Interfaz genérica de conector base
// Todos los conectores del sistema (AI, MCP, etc.) implementan esta interfaz

export interface ConnectorMetadata {
  name: string;
  version: string;
  type: ConnectorType;
  description?: string;
}

export type ConnectorType = 'ai' | 'mcp' | 'plugin' | 'skill' | 'custom';

export type ConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectorState {
  status: ConnectorStatus;
  lastError?: Error;
  connectedAt?: Date;
}

export interface BaseConnector {
  readonly metadata: ConnectorMetadata;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getState(): ConnectorState;
  isConnected(): boolean;
}

// Helper funcional para crear conectores
export const createConnectorState = (): ConnectorState => ({
  status: 'disconnected',
});

export const isConnectorHealthy = (state: ConnectorState): boolean =>
  state.status === 'connected';