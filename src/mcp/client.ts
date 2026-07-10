import type { 
  MCPRequest, 
  MCPResponse, 
  MCPNotification,
  MCPToolDefinition,
  MCPPromptDefinition,
  MCPResourceDefinition,
  MCPServerConfig 
} from '../core/mcp/types.js';

export interface MCPClient {
  /** Conecta al servidor MCP */
  connect(): Promise<void>;
  
  /** Desconecta del servidor */
  disconnect(): Promise<void>;
  
  /** Envía un request y espera respuesta */
  request(method: string, params?: unknown): Promise<unknown>;
  
  /** Envía una notificación (sin respuesta) */
  notify(method: string, params?: unknown): Promise<void>;
  
  /** Lista herramientas disponibles */
  listTools(): Promise<MCPToolDefinition[]>;
  
  /** Lista prompts disponibles */
  listPrompts(): Promise<MCPPromptDefinition[]>;
  
  /** Lista recursos disponibles */
  listResources(): Promise<MCPResourceDefinition[]>;
  
  /** Ejecuta una herramienta */
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  
  /** Lee un recurso */
  readResource(uri: string): Promise<string>;
  
  /** Estado de la conexión */
  isConnected(): boolean;
}

interface StdioTransport {
  type: 'stdio';
  // En una implementación real usaríamos child_process
  // Por ahora es un placeholder para la interfaz
}

interface HTTPTransport {
  type: 'sse' | 'streamable-http';
  url: string;
  headers?: Record<string, string>;
}

type Transport = StdioTransport | HTTPTransport;

const resolveTransport = (config: MCPServerConfig): Transport => {
  if (config.type === 'stdio' || !config.url) {
    return {
      type: 'stdio',
    };
  }
  
  return {
    type: config.type ?? 'sse',
    url: config.url,
    headers: config.headers,
  };
};

let requestId = 0;
const nextId = () => ++requestId;

export const createMCPClient = (config: MCPServerConfig): MCPClient => {
  const transport = resolveTransport(config);
  let connected = false;
  
  // Simulación de herramientas - en producción se descubren del servidor
  const mockTools: MCPToolDefinition[] = [
    {
      name: 'echo',
      description: 'Echoes back the input',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  ];

  const mockResources: MCPResourceDefinition[] = [
    {
      uri: 'file:///project/readme',
      name: 'Project README',
      description: 'README file of the current project',
    },
  ];

  const sendRequest = async (method: string, params?: unknown): Promise<unknown> => {
    if (!connected) {
      throw new Error('MCP client not connected');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: nextId(),
    };

    // En implementación real:
    // - stdio: escribir a stdin del proceso hijo, leer de stdout
    // - HTTP: fetch POST a endpoint con SSE para streaming
    
    console.log(`[MCP Client] → ${method}`, params);
    
    // Placeholder: simular respuesta para herramientas mock
    if (method === 'tools/list') {
      return { tools: mockTools };
    }
    
    if (method === 'resources/list') {
      return { resources: mockResources };
    }
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params as any;
      if (name === 'echo') {
        return { content: [{ type: 'text', text: args?.message ?? 'Echo!' }] };
      }
      return { content: [{ type: 'text', text: `Tool '${name}' executed` }] };
    }
    
    if (method === 'resources/read') {
      return { contents: [{ uri: (params as any)?.uri, text: 'Resource content placeholder' }] };
    }

    return { ok: true };
  };

  return {
    async connect() {
      if (connected) return;
      
      if (transport.type === 'stdio') {
        // En producción: spawn process con config.command y config.args
        console.log(`[MCP Client] Connecting to ${config.name} via stdio...`);
      } else {
        console.log(`[MCP Client] Connecting to ${config.name} at ${transport.url}...`);
      }
      
      // Simular handshake
      await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'your-harness',
          version: '0.1.0',
        },
      });
      
      connected = true;
      console.log(`[MCP Client] Connected to ${config.name}`);
    },

    async disconnect() {
      if (!connected) return;
      connected = false;
      console.log(`[MCP Client] Disconnected from ${config.name}`);
    },

    async request(method, params) {
      return sendRequest(method, params);
    },

    async notify(method, params) {
      if (!connected) {
        throw new Error('MCP client not connected');
      }
      
      const notification: MCPNotification = {
        jsonrpc: '2.0',
        method,
        params,
      };
      
      console.log(`[MCP Client] ↝ ${method}`, params);
    },

    async listTools() {
      const response = await sendRequest('tools/list') as any;
      return response?.tools ?? [];
    },

    async listPrompts() {
      const response = await sendRequest('prompts/list') as any;
      return response?.prompts ?? [];
    },

    async listResources() {
      const response = await sendRequest('resources/list') as any;
      return response?.resources ?? [];
    },

    async callTool(name, args) {
      const response = await sendRequest('tools/call', {
        name,
        arguments: args,
      });
      return response;
    },

    async readResource(uri) {
      const response = await sendRequest('resources/read', { uri });
      return JSON.stringify(response);
    },

    isConnected() {
      return connected;
    },
  };
};