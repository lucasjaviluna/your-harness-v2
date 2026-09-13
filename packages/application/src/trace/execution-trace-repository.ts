import type { ExecutionTrace } from "./execution-trace.js";

/** Persistencia operacional de trazas; no es un repositorio de aggregates. */
export interface ExecutionTraceRepository {
  save(trace: ExecutionTrace): Promise<void>;
  findById(id: string): Promise<ExecutionTrace | null>;
  findByWorkItemId(workItemId: string): Promise<ReadonlyArray<ExecutionTrace>>;
}
