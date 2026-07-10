import type { AIManager } from '../core/ai/manager.js';
import type { Message, ToolCall } from '../core/ai/types.js';
import type { 
  AgentDefinition, 
  AgentContext, 
  AgentStep, 
  AgentResult, 
  AgentEvent,
  AgentEventCallback,
  ToolExecutor 
} from './types.js';

export interface AgentRunner {
  /** Ejecuta un agente con un objetivo */
  run(
    definition: AgentDefinition,
    objective: string,
    context: {
      session: AgentContext['session'];
      toolExecutor: ToolExecutor;
      aiManager: AIManager;
      onEvent?: AgentEventCallback;
    }
  ): Promise<AgentResult>;
}

const generateStepId = (): string => {
  return `step_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

const emitEvent = async (
  callback: AgentEventCallback | undefined,
  type: AgentEvent['type'],
  agentName: string,
  data: unknown
) => {
  if (callback) {
    await callback({
      type,
      agentName,
      data,
      timestamp: new Date(),
    });
  }
};

export const createAgentRunner = (): AgentRunner => {
  return {
    async run(definition, objective, { session, toolExecutor, aiManager, onEvent }) {
      const startTime = Date.now();
      const maxIterations = definition.maxIterations ?? 10;
      
      const messages: Message[] = [
        {
          role: 'system',
          content: definition.systemPrompt,
        },
        {
          role: 'user',
          content: objective,
        },
      ];

      const tools = [
        ...(definition.tools ?? []),
        ...toolExecutor.listTools(),
      ];

      const steps: AgentStep[] = [];
      let finalMessage = '';
      let success = false;

      try {
        for (let iteration = 0; iteration < maxIterations; iteration++) {
          const stepStart = Date.now();
          
          await emitEvent(onEvent, 'step:start', definition.name, { iteration });

          // Llamar al modelo
          const response = await aiManager.complete({
            messages,
            tools: tools.length > 0 ? tools : undefined,
            temperature: definition.temperature,
          });

          const assistantMessage = response.message;
          messages.push(assistantMessage);

          // Si no hay tool calls, el agente terminó
          if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
            const step: AgentStep = {
              id: generateStepId(),
              iteration,
              type: 'response',
              content: assistantMessage.content,
              timestamp: new Date(),
              duration: Date.now() - stepStart,
            };
            steps.push(step);
            
            await emitEvent(onEvent, 'step:complete', definition.name, step);

            finalMessage = assistantMessage.content;
            success = true;
            break;
          }

          // Procesar tool calls
          for (const toolCall of assistantMessage.toolCalls) {
            await emitEvent(onEvent, 'tool:start', definition.name, { toolCall });

            const toolStart = Date.now();
            let toolResult;

            try {
              const args = JSON.parse(toolCall.function.arguments);
              toolResult = await toolExecutor.execute(toolCall.function.name, args);
            } catch (error) {
              toolResult = {
                toolCallId: toolCall.id,
                content: `Error executing tool: ${(error as Error).message}`,
                isError: true,
              };
            }

            const step: AgentStep = {
              id: generateStepId(),
              iteration,
              type: 'action',
              content: `Calling ${toolCall.function.name}`,
              toolCall,
              toolResult,
              timestamp: new Date(),
              duration: Date.now() - toolStart,
            };
            steps.push(step);

            await emitEvent(onEvent, 'tool:complete', definition.name, step);

            // Agregar resultado al historial
            messages.push({
              role: 'tool',
              content: toolResult.content,
              toolCallId: toolCall.id,
              name: toolCall.function.name,
            });
          }

          await emitEvent(onEvent, 'step:complete', definition.name, { iteration });
        }

        // Si llegó al máximo sin finalizar
        if (!success) {
          finalMessage = 'Agent reached maximum iterations without completing the task.';
          
          // Intentar obtener una respuesta final
          messages.push({
            role: 'user',
            content: 'Please provide your final answer based on the work done so far.',
          });

          const finalResponse = await aiManager.complete({
            messages,
            temperature: definition.temperature,
          });

          finalMessage = finalResponse.message.content;
          success = true;
        }

      } catch (error) {
        await emitEvent(onEvent, 'agent:error', definition.name, { error });
        
        return {
          success: false,
          finalMessage: '',
          steps,
          totalDuration: Date.now() - startTime,
          iterations: steps.length,
          error: (error as Error).message,
        };
      }

      const result: AgentResult = {
        success,
        finalMessage,
        steps,
        totalDuration: Date.now() - startTime,
        iterations: steps.filter(s => s.type === 'action').length,
      };

      await emitEvent(onEvent, 'agent:complete', definition.name, result);

      return result;
    },
  };
};