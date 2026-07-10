import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../core/ai/types.js';

export interface LocalConfig {
  endpoint?: string;
  model?: string;
}

const DEFAULT_ENDPOINT = 'http://localhost:11434/v1';
const DEFAULT_MODEL = 'llama3';

export const createLocalProvider = (config: LocalConfig = {}): AIProvider => {
  const endpoint = config.endpoint ?? process.env.OLLAMA_HOST?.replace(/\/$/, '') + '/v1' ?? DEFAULT_ENDPOINT;
  const model = config.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  const complete = async (request: CompletionRequest): Promise<CompletionResponse> => {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.name && { name: m.name }),
        })),
        ...(request.tools && { tools: request.tools }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens && { max_tokens: request.maxTokens }),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local model error: ${response.status} - ${error}. Is Ollama running?`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      id: data.id ?? `local-${Date.now()}`,
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
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.name && { name: m.name }),
        })),
        ...(request.tools && { tools: request.tools }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens && { max_tokens: request.maxTokens }),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model streaming error: ${response.status}`);
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
    try {
      const baseEndpoint = endpoint.replace(/\/v1\/?$/, '');
      const response = await fetch(`${baseEndpoint}/api/tags`);
      
      if (!response.ok) return [model];
      
      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) ?? [model];
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