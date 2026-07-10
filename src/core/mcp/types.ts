import type { MCPServerEntry } from '../../types/index.js';

// Configuración extendida de servidor MCP
export interface MCPServerConfig extends MCPServerEntry {
  type?: 'stdio' | 'sse' | 'streamable-http';
  url?: string;
  headers?: Record<string, string>;
}

// Herramienta expuesta por un servidor MCP
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

// Prompt expuesto por un servidor MCP
export interface MCPPromptDefinition {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

// Recurso expuesto por un servidor MCP
export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Mensajes JSON-RPC 2.0 genéricos
export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: number | string;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}