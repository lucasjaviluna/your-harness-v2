import type { ChangeMaterializationAudit } from "./change-materialization-audit.js";
import type { ChangeMaterializationAuditRepository } from "./change-materialization-audit-repository.js";

export class InMemoryChangeMaterializationAuditRepository implements ChangeMaterializationAuditRepository {
  readonly #entries = new Map<string, ChangeMaterializationAudit>();

  async save(audit: ChangeMaterializationAudit): Promise<void> {
    if (this.#entries.has(audit.id)) throw new Error(`ChangeMaterializationAudit '${audit.id}' already exists and is immutable.`);
    this.#entries.set(audit.id, audit);
  }

  async findByHandoffId(handoffId: string): Promise<ReadonlyArray<ChangeMaterializationAudit>> {
    return [...this.#entries.values()].filter((entry) => entry.handoffId === handoffId);
  }

  async findCurrentByChangeId(changeId: string): Promise<ChangeMaterializationAudit | undefined> {
    return [...this.#entries.values()]
      .filter((entry) => entry.changeId === changeId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .at(-1);
  }
}
