import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../core/ai/types.js';

export interface CopilotConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

const DEFAULT_ENDPOINT = 'https://api.githubcopilot.com/v1';
const DEFAULT_MODEL = 'copilot-gpt-4';

export const createCopilotProvider = (config: CopilotConfig = {}): AIProvider => {
  const apiKey = config.apiKey ?? process.env.COPILOT_API_KEY;
  const endpoint = config.endpoint ?? process.env.COPILOT_ENDPOINT ?? DEFAULT_ENDPOINT;
  const model = config.model ?? DEFAULT_MODEL;

  const complete = async (request: CompletionRequest): Promise<CompletionResponse> => {
    if (!apiKey) {
      throw new Error('GitHub Copilot API key not configured. Set COPILOT_API_KEY.');
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Copilot-Integration-Version': 'your-harness',
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
      throw new Error(`Copilot API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      id: data.id ?? `copilot-${Date.now()}`,
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
      throw new Error('GitHub Copilot API key not configured.');
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Copilot-Integration-Version': 'your-harness',
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
      throw new Error(`Copilot streaming error: ${response.status}`);
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
    return [model, 'copilot-gpt-4', 'copilot-gpt-3.5'];
  };

  return {
    complete,
    stream,
    listModels,
  };
};