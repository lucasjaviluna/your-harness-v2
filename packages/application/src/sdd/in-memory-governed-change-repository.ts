import type { GovernedChangeRecord } from "./governed-change.js";
import type { GovernedChangeRepository } from "./governed-change-repository.js";

export class InMemoryGovernedChangeRepository implements GovernedChangeRepository {
  private readonly records = new Map<string, GovernedChangeRecord[]>();

  async save(record: GovernedChangeRecord): Promise<void> {
    const existing = this.records.get(record.changeId) ?? [];
    if (existing.some((candidate) => candidate.id === record.id)) {
      throw new Error(`Governed Change record '${record.id}' already exists.`);
    }
    this.records.set(record.changeId, [...existing, { ...record, provenance: { ...record.provenance } }]);
  }

  async findCurrentByChangeId(changeId: string): Promise<GovernedChangeRecord | undefined> {
    const records = this.records.get(changeId) ?? [];
    return records.at(-1);
  }

  async findByChangeId(changeId: string): Promise<ReadonlyArray<GovernedChangeRecord>> {
    return [...(this.records.get(changeId) ?? [])];
  }
}
