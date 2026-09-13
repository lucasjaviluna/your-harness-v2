import type { Evidence } from "./evidence.js";
import type { EvidenceRepository } from "./evidence-repository.js";

/** Adaptador de tests/composición; rechaza sobrescribir evidencia inmutable. */
export class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly #entries = new Map<string, Evidence>();

  async save(evidence: Evidence): Promise<void> {
    if (this.#entries.has(evidence.id)) {
      throw new Error(`Evidence '${evidence.id}' already exists and is immutable.`);
    }
    this.#entries.set(evidence.id, evidence);
  }

  async findById(id: string): Promise<Evidence | null> {
    return this.#entries.get(id) ?? null;
  }

  async findByExecutionTraceId(executionTraceId: string): Promise<ReadonlyArray<Evidence>> {
    return [...this.#entries.values()].filter(
      (evidence) => evidence.executionTraceId === executionTraceId,
    );
  }
}
