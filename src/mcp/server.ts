import type { MCPToolDefinition, MCPRequest, MCPResponse } from '../core/mcp/types.js';

export interface MCPServer {
  /** Inicia el servidor */
  start(): Promise<void>;
  
  /** Detiene el servidor */
  stop(): Promise<void>;
  
  /** Registra una herramienta en el servidor */
  registerTool(definition: MCPToolDefinition, handler: ToolHandler): void;
  
  /** Registra un recurso */
  registerResource(uri: string, name: string, handler: ResourceHandler): void;
  
  /** Elimina una herramienta */
  unregisterTool(name: string): void;
  
  /** Lista herramientas registradas */
  listTools(): MCPToolDefinition[];
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
export type ResourceHandler = (uri: string) => Promise<string>;

interface RegisteredTool {
  definition: MCPToolDefinition;
  handler: ToolHandler;
}

interface RegisteredResource {
  uri: string;
  name: string;
  handler: ResourceHandler;
}

const processRequest = async (
  request: MCPRequest,
  tools: Map<string, RegisteredTool>,
  resources: Map<string, RegisteredResource>
): Promise<MCPResponse> => {
  const { method, params, id } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'your-harness-mcp',
              version: '0.1.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Array.from(tools.values()).map(t => t.definition),
          },
        };

      case 'tools/call': {
        const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> };
        const tool = tools.get(name);
        
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${name}`,
            },
          };
        }

        const result = await tool.handler(args ?? {});
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            ],
          },
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: Array.from(resources.values()).map(r => ({
              uri: r.uri,
              name: r.name,
            })),
          },
        };

      case 'resources/read': {
        const { uri } = params as { uri: string };
        const resource = resources.get(uri);
        
        if (!resource) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Resource not found: ${uri}`,
            },
          };
        }

        const content = await resource.handler(uri);
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                text: content,
              },
            ],
          },
        };
      }

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: { pong: true },
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: (error as Error).message,
      },
    };
  }
};

export const createMCPServer = (): MCPServer => {
  const tools = new Map<string, RegisteredTool>();
  const resources = new Map<string, RegisteredResource>();
  let running = false;

  // En una implementación real:
  // - Modo stdio: leer JSON-RPC de stdin, escribir a stdout
  // - Modo HTTP: levantar servidor HTTP con endpoint /mcp

  const handleRequest = async (request: MCPRequest): Promise<MCPResponse> => {
    return processRequest(request, tools, resources);
  };

  return {
    async start() {
      if (running) return;
      
      // En producción, aquí se inicia el listener (stdio o HTTP)
      // Por ahora es un placeholder para la interfaz
      
      running = true;
      console.log('[MCP Server] Started - waiting for connections...');
      
      // Simular procesamiento de requests vía stdin
      if (process.stdin.isTTY) {
        console.log('[MCP Server] Running in interactive mode');
        console.log('[MCP Server] Send JSON-RPC requests via stdin:');
        
        process.stdin.on('data', async (data) => {
          try {
            const request = JSON.parse(data.toString()) as MCPRequest;
            const response = await handleRequest(request);
            console.log(JSON.stringify(response));
          } catch (error) {
            console.error('[MCP Server] Parse error:', (error as Error).message);
          }
        });
      }
    },

    async stop() {
      if (!running) return;
      running = false;
      console.log('[MCP Server] Stopped');
    },

    registerTool(definition, handler) {
      tools.set(definition.name, { definition, handler });
      console.log(`[MCP Server] Tool registered: ${definition.name}`);
    },

    registerResource(uri, name, handler) {
      resources.set(uri, { uri, name, handler });
      console.log(`[MCP Server] Resource registered: ${name} (${uri})`);
    },

    unregisterTool(name) {
      tools.delete(name);
      console.log(`[MCP Server] Tool unregistered: ${name}`);
    },

    listTools() {
      return Array.from(tools.values()).map(t => t.definition);
    },
  };
};