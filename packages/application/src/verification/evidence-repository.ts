import type { Evidence } from "./evidence.js";

export interface EvidenceRepository {
  save(evidence: Evidence): Promise<void>;
  findById(id: string): Promise<Evidence | null>;
  findByExecutionTraceId(executionTraceId: string): Promise<ReadonlyArray<Evidence>>;
}
