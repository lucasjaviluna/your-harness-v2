import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../core/ai/types.js';

export interface CustomConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  headers?: Record<string, string>;
}

const DEFAULT_ENDPOINT = 'http://localhost:8080/v1';
const DEFAULT_MODEL = 'custom-model';

// Util para: LiteLLM, vLLM, LocalAI, text-generation-webui, o cualquier proxy OpenAI-compatible
export const createCustomProvider = (config: CustomConfig = {}): AIProvider => {
  const apiKey = config.apiKey ?? process.env.CUSTOM_AI_API_KEY;
  const endpoint = config.endpoint ?? process.env.CUSTOM_AI_ENDPOINT ?? DEFAULT_ENDPOINT;
  const model = config.model ?? process.env.CUSTOM_AI_MODEL ?? DEFAULT_MODEL;
  const customHeaders = config.headers ?? {};

  const complete = async (request: CompletionRequest): Promise<CompletionResponse> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls && { tool_calls: m.toolCalls }),
          ...(m.toolCallId && { tool_call_id: m.toolCallId }),
          ...(m.name && { name: m.name }),
        })),
        ...(request.tools && { tools: request.tools }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens && { max_tokens: request.maxTokens }),
        ...(request.stopSequences && { stop: request.stopSequences }),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom provider error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      id: data.id ?? `custom-${Date.now()}`,
      message: {
        role: 'assistant',
        content: choice?.message?.content ?? '',
        toolCalls: choice?.message?.tool_calls,
      },
      finishReason: choice?.finish_reason ?? 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      model: data.model ?? model,
    };
  };

  const stream = async function* (request: CompletionRequest): AsyncIterable<StreamChunk> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls && { tool_calls: m.toolCalls }),
          ...(m.toolCallId && { tool_call_id: m.toolCallId }),
          ...(m.name && { name: m.name }),
        })),
        ...(request.tools && { tools: request.tools }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens && { max_tokens: request.maxTokens }),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom provider streaming error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            yield {
              content: delta.content ?? '',
              toolCallDelta: delta.tool_calls?.[0],
              finishReason: parsed.choices?.[0]?.finish_reason,
            };
          }
        } catch {
          // Ignorar líneas mal formadas
        }
      }
    }
  };

  const listModels = async (): Promise<string[]> => {
    const headers: Record<string, string> = {
      ...customHeaders,
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${endpoint}/models`, { headers });
      
      if (!response.ok) return [model];
      
      const data = await response.json() as any;
      return data.data?.map((m: any) => m.id) ?? [model];
    } catch {
      return [model];
    }
  };

  return {
    complete,
    stream,
    listModels,
  };
};