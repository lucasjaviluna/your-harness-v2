// Tipos agnósticos para interacciones con IA

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface CompletionRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  model?: string;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  message: Message;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface StreamChunk {
  content: string;
  toolCallDelta?: Partial<ToolCall>;
  finishReason?: string;
}

export type CompletionHandler = (request: CompletionRequest) => Promise<CompletionResponse>;
export type StreamHandler = (request: CompletionRequest) => AsyncIterable<StreamChunk>;

export interface AIProvider extends CompletionHandler {
  stream?: StreamHandler;
  listModels?: () => Promise<string[]>;
}