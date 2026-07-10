import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../core/ai/types.js';

export interface OpenAIConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';

export const createOpenAIProvider = (config: OpenAIConfig = {}): AIProvider => {
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const model = config.model ?? DEFAULT_MODEL;

  const complete = async (request: CompletionRequest): Promise<CompletionResponse> => {
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY.');
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
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
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      id: data.id ?? `openai-${Date.now()}`,
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
    if (!apiKey) {
      throw new Error('OpenAI API key not configured.');
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
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
      throw new Error(`OpenAI streaming error: ${response.status}`);
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
    if (!apiKey) return [model];

    try {
      const response = await fetch(`${endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) return [model];
      
      const data = await response.json() as any;
      return data.data
        ?.filter((m: any) => m.id.startsWith('gpt'))
        .map((m: any) => m.id) ?? [model];
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