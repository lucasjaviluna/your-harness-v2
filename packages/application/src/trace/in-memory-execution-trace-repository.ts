import type { ExecutionTrace } from "./execution-trace.js";
import type { ExecutionTraceRepository } from "./execution-trace-repository.js";

/** Implementación temporal para composición y tests sin persistencia externa. */
export class InMemoryExecutionTraceRepository implements ExecutionTraceRepository {
  readonly #items = new Map<string, ExecutionTrace>();

  async save(trace: ExecutionTrace): Promise<void> {
    this.#items.set(trace.id, trace);
  }

  async findById(id: string): Promise<ExecutionTrace | null> {
    return this.#items.get(id) ?? null;
  }

  async findByWorkItemId(workItemId: string): Promise<ReadonlyArray<ExecutionTrace>> {
    return [...this.#items.values()].filter((trace) => trace.workItemId === workItemId);
  }
}
