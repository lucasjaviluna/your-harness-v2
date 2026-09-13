import type { ExecutionTraceRepository } from "../trace/execution-trace-repository.js";
import { createEvidence, type CreateEvidenceInput, type Evidence } from "./evidence.js";
import type { EvidenceRepository } from "./evidence-repository.js";

/** Registra una observación sólo si su ejecución durable/conocida existe. */
export class RecordEvidenceUseCase {
  constructor(
    private readonly traces: ExecutionTraceRepository,
    private readonly evidence: EvidenceRepository,
  ) {}

  async execute(input: CreateEvidenceInput): Promise<Evidence> {
    const item = createEvidence(input);
    const trace = await this.traces.findById(item.executionTraceId);
    if (!trace) {
      throw new Error(`ExecutionTrace '${item.executionTraceId}' was not found.`);
    }
    await this.evidence.save(item);
    return item;
  }
}
