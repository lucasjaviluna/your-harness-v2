import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../core/ai/types.js';

export interface ClaudeConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_VERSION = '2023-06-01';

export const createClaudeProvider = (config: ClaudeConfig = {}): AIProvider => {
  const apiKey = config.apiKey ?? process.env.CLAUDE_API_KEY;
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const model = config.model ?? DEFAULT_MODEL;

  const mapMessages = (messages: CompletionRequest['messages']) => {
    // Anthropic no soporta role 'system' en messages array
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
    
    return {
      system: systemPrompt || undefined,
      messages: otherMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };
  };

  const mapTools = (tools?: CompletionRequest['tools']) => {
    if (!tools || tools.length === 0) return undefined;
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  };

  const complete = async (request: CompletionRequest): Promise<CompletionResponse> => {
    if (!apiKey) {
      throw new Error('Claude API key not configured. Set CLAUDE_API_KEY.');
    }

    const { system, messages } = mapMessages(request.messages);
    const mappedTools = mapTools(request.tools);

    const body: any = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      ...(system && { system }),
      ...(mappedTools && { tools: mappedTools }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.stopSequences && { stop_sequences: request.stopSequences }),
      stream: false,
    };

    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    
    // Extraer tool calls si existen
    const toolCalls = data.content
      ?.filter((c: any) => c.type === 'tool_use')
      .map((c: any) => ({
        id: c.id,
        type: 'function' as const,
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input),
        },
      }));

    const textContent = data.content
      ?.filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('') ?? '';

    return {
      id: data.id ?? `claude-${Date.now()}`,
      message: {
        role: 'assistant',
        content: textContent,
        ...(toolCalls?.length && { toolCalls }),
      },
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 
                    data.stop_reason === 'max_tokens' ? 'length' : 
                    data.stop_reason === 'end_turn' ? 'stop' : 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      model: data.model ?? model,
    };
  };

  const stream = async function* (request: CompletionRequest): AsyncIterable<StreamChunk> {
    if (!apiKey) {
      throw new Error('Claude API key not configured.');
    }

    const { system, messages } = mapMessages(request.messages);

    const body: any = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      ...(system && { system }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      stream: true,
    };

    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Claude streaming error: ${response.status}`);
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
          
          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta') {
              yield { content: parsed.delta.text };
            } else if (parsed.delta?.type === 'input_json_delta') {
              yield { content: parsed.delta.partial_json };
            }
          } else if (parsed.type === 'message_delta') {
            yield {
              content: '',
              finishReason: parsed.delta?.stop_reason,
            };
          }
        } catch {
          // Ignorar líneas mal formadas
        }
      }
    }
  };

  const listModels = async (): Promise<string[]> => {
    return [
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-haiku-3-5',
    ];
  };

  return {
    complete,
    stream,
    listModels,
  };
};