import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  WorkflowStatus,
  WorkflowEventCallback,
  ParallelStepConfig,
  ConditionStepConfig,
  WorkflowEvent,
} from './types.js';
import type { AgentRunner } from '../agents/runner.js';
import type { AIManager } from '../core/ai/manager.js';
import type { SessionContext } from '../types/index.js';
import type { ToolExecutor } from '../agents/types.js';
import type { AgentDefinition } from '../agents/types.js';

export interface WorkflowEngine {
  /** Ejecuta un workflow completo */
  execute(
    workflow: WorkflowDefinition,
    context: {
      session: SessionContext;
      agentRunner: AgentRunner;
      aiManager: AIManager;
      toolExecutor: ToolExecutor;
      agents: Record<string, AgentDefinition>;
      onEvent?: WorkflowEventCallback;
      variables?: Record<string, string>;
    }
  ): Promise<WorkflowResult>;
}

const replaceVariables = (text: string, variables: Record<string, string>): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
};

const emitEvent = async (
  callback: WorkflowEventCallback | undefined,
  type: WorkflowEvent['type'],
  workflowName: string,
  stepId: string | undefined,
  data: unknown
) => {
  if (callback) {
    await callback({ type, workflowName, stepId, data, timestamp: new Date() });
  }
};

const executeStep = async (
  step: WorkflowStep,
  context: WorkflowContext,
  engineContext: {
    agentRunner: AgentRunner;
    aiManager: AIManager;
    toolExecutor: ToolExecutor;
    agents: Record<string, AgentDefinition>;
    onEvent?: WorkflowEventCallback;
  }
): Promise<StepResult> => {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = step.retryCount ?? 0;

  while (true) {
    try {
      await emitEvent(engineContext.onEvent, 'step:start', context.workflow.name, step.id, { step });

      const timeout = step.timeout ? step.timeout * 1000 : undefined;
      const result = await executeWithTimeout(step, context, engineContext, timeout);

      const stepResult: StepResult = {
        stepId: step.id,
        success: true,
        output: result,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        retries,
      };

      context.stepResults.set(step.id, stepResult);
      await emitEvent(engineContext.onEvent, 'step:complete', context.workflow.name, step.id, { stepResult });

      return stepResult;

    } catch (error) {
      retries++;
      
      if (retries <= maxRetries) {
        const delay = (step.retryDelay ?? 1000) * retries;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const stepResult: StepResult = {
        stepId: step.id,
        success: false,
        error: (error as Error).message,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        retries,
      };

      context.stepResults.set(step.id, stepResult);
      await emitEvent(engineContext.onEvent, 'step:error', context.workflow.name, step.id, { stepResult, error });

      return stepResult;
    }
  }
};

const executeWithTimeout = async (
  step: WorkflowStep,
  context: WorkflowContext,
  engineContext: {
    agentRunner: AgentRunner;
    aiManager: AIManager;
    toolExecutor: ToolExecutor;
    agents: Record<string, AgentDefinition>;
  },
  timeoutMs?: number
): Promise<unknown> => {
  const execute = async (): Promise<unknown> => {
    switch (step.config.type) {
      case 'agent': {
        const config = step.config;
        const objective = replaceVariables(config.objective, context.variables);
        const agent = engineContext.agents[config.agent];
        
        if (!agent) throw new Error(`Agent '${config.agent}' not found`);

        return engineContext.agentRunner.run(agent, objective, {
          session: context.session,
          toolExecutor: engineContext.toolExecutor,
          aiManager: engineContext.aiManager,
        });
      }

      case 'command': {
        const config = step.config;
        const command = replaceVariables(config.command, context.variables);
        // En producción usar child_process.exec
        console.log(`[Workflow] Executing command: ${command}`);
        return { command, output: 'Command executed (placeholder)' };
      }

      case 'script': {
        const config = step.config;
        const code = replaceVariables(config.code, context.variables);
        console.log(`[Workflow] Executing ${config.language} script`);
        // En producción usar vm2 o child_process
        return { result: 'Script executed (placeholder)' };
      }

      case 'parallel': {
        const config = step.config as ParallelStepConfig;
        const promises = config.steps.map(s => 
          executeStep(s, context, engineContext)
        );

        if (config.failFast) {
          // Si una falla, cancelar todas
          const results = await Promise.all(promises);
          const failed = results.find(r => !r.success);
          if (failed) throw new Error(`Parallel step failed: ${failed.stepId}`);
          return results;
        }

        // Esperar todas, ignorar fallos individuales
        return Promise.allSettled(promises);
      }

      case 'condition': {
        const config = step.config as ConditionStepConfig;
        for (const branch of config.branches) {
          const conditionResult = evaluateCondition(branch.condition, context);
          if (conditionResult) {
            const results: StepResult[] = [];
            for (const branchStep of branch.steps) {
              const result = await executeStep(branchStep, context, engineContext);
              results.push(result);
              if (!result.success) break;
            }
            return results;
          }
        }
        // Default branch
        if (config.default) {
          const results: StepResult[] = [];
          for (const defaultStep of config.default) {
            const result = await executeStep(defaultStep, context, engineContext);
            results.push(result);
            if (!result.success) break;
          }
          return results;
        }
        return null;
      }

      case 'wait': {
        const config = step.config;
        console.log(`[Workflow] Waiting: ${config.message}`);
        return { choice: config.defaultChoice ?? 'continue' };
      }

      case 'transform': {
        const config = step.config;
        const inputRef = config.input.replace(/^\$/, '');
        const input = context.stepResults.get(inputRef)?.output;
        console.log(`[Workflow] Transforming input from ${config.input}`);
        return { transformed: input };
      }

      default:
        throw new Error(`Unknown step type: ${(step.config as any).type}`);
    }
  };

  if (timeoutMs) {
    return Promise.race([
      execute(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Step '${step.id}' timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  return execute();
};

const evaluateCondition = (condition: string, context: WorkflowContext): boolean => {
  // Evaluación simple de condiciones
  // En producción usar un evaluador seguro como expr-eval o similar
  
  if (condition === 'true') return true;
  if (condition === 'false') return false;
  
  // Soporte para verificar resultados de steps previos
  const stepResultMatch = condition.match(/\$(.+)\.success/);
  if (stepResultMatch) {
    const stepId = stepResultMatch[1];
    const result = context.stepResults.get(stepId);
    return result?.success ?? false;
  }

  return true;
};

const resolveStepOrder = (steps: WorkflowStep[]): WorkflowStep[][] => {
  const resolved = new Set<string>();
  const remaining = new Map(steps.map(s => [s.id, s]));
  const levels: WorkflowStep[][] = [];

  while (remaining.size > 0) {
    const level: WorkflowStep[] = [];

    for (const [id, step] of remaining) {
      const deps = step.dependsOn ?? [];
      if (deps.every(d => resolved.has(d))) {
        level.push(step);
        remaining.delete(id);
      }
    }

    if (level.length === 0 && remaining.size > 0) {
      // Dependencia circular detectada
      throw new Error(`Circular dependency detected in workflow steps: ${Array.from(remaining.keys()).join(', ')}`);
    }

    for (const step of level) {
      resolved.add(step.id);
    }

    levels.push(level);
  }

  return levels;
};

export const createWorkflowEngine = (): WorkflowEngine => {
  return {
    async execute(workflow, context) {
      const startTime = Date.now();
      
      await emitEvent(context.onEvent, 'workflow:start', workflow.name, undefined, { workflow });

      // Inicializar contexto
      const wfContext: WorkflowContext = {
        workflow,
        session: context.session,
        variables: {
          ...workflow.variables,
          ...context.variables,
        },
        stepResults: new Map(),
        status: 'running',
        startedAt: new Date(),
      };

      try {
        // Resolver orden de ejecución (DAG en niveles)
        const levels = resolveStepOrder(workflow.steps);
        const allResults: StepResult[] = [];

        for (const level of levels) {
          // Steps en el mismo nivel pueden ejecutarse en paralelo
          const levelPromises = level.map(step => {
            // Verificar condición
            if (step.condition) {
              const shouldRun = evaluateCondition(step.condition, wfContext);
              if (!shouldRun) {
                emitEvent(context.onEvent, 'step:skip', workflow.name, step.id, { condition: step.condition });
                return null;
              }
            }
            return executeStep(step, wfContext, {
              agentRunner: context.agentRunner,
              aiManager: context.aiManager,
              toolExecutor: context.toolExecutor,
              agents: context.agents,
              onEvent: context.onEvent 
                ? (event) => context.onEvent?.(event) 
                : undefined,
            });
          });

          const results = await Promise.all(levelPromises);
          
          for (const result of results) {
            if (result) {
              allResults.push(result);
              if (!result.success) {
                // Step falló - detener ejecución
                throw new Error(`Step '${result.stepId}' failed: ${result.error}`);
              }
            }
          }
        }

        wfContext.status = 'completed';
        wfContext.completedAt = new Date();

        const finalResult: WorkflowResult = {
          success: true,
          steps: allResults,
          totalDuration: Date.now() - startTime,
          outputs: Object.fromEntries(
            Array.from(wfContext.stepResults.entries()).map(([id, r]) => [id, r.output])
          ),
        };

        await emitEvent(context.onEvent, 'workflow:complete', workflow.name, undefined, { result: finalResult });

        return finalResult;

      } catch (error) {
        wfContext.status = 'failed';
        
        const errorResult: WorkflowResult = {
          success: false,
          steps: Array.from(wfContext.stepResults.values()),
          totalDuration: Date.now() - startTime,
          error: (error as Error).message,
          outputs: {},
        };

        await emitEvent(context.onEvent, 'workflow:error', workflow.name, undefined, { error: errorResult });

        return errorResult;
      }
    },
  };
};