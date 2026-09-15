import type { ChangeApplyTransitionRecord } from "./change-apply-transition.js";
import type { ChangeApplyTransitionRepository } from "./change-apply-transition-repository.js";

export class InMemoryChangeApplyTransitionRepository implements ChangeApplyTransitionRepository {
  readonly #entries = new Map<string, ChangeApplyTransitionRecord>();

  async save(record: ChangeApplyTransitionRecord): Promise<void> {
    if (this.#entries.has(record.id)) throw new Error(`Change Apply transition '${record.id}' already exists and is immutable.`);
    this.#entries.set(record.id, record);
  }

  async findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeApplyTransitionRecord>> {
    return [...this.#entries.values()].filter((entry) => entry.changeId === changeId).sort((left, right) => left.changedAt.localeCompare(right.changedAt));
  }

  async findCurrentByChangeId(changeId: string): Promise<ChangeApplyTransitionRecord | undefined> {
    return (await this.findByChangeId(changeId)).at(-1);
  }

  async findByAttemptId(attemptId: string): Promise<ReadonlyArray<ChangeApplyTransitionRecord>> {
    return [...this.#entries.values()].filter((entry) => entry.attemptId === attemptId).sort((left, right) => left.changedAt.localeCompare(right.changedAt));
  }
}
