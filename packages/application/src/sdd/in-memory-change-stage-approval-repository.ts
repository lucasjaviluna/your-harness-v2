import type { ChangeStageApproval } from "./change-stage-approval.js";
import type { ChangeStageApprovalRepository } from "./change-stage-approval-repository.js";

export class InMemoryChangeStageApprovalRepository implements ChangeStageApprovalRepository {
  readonly #entries = new Map<string, ChangeStageApproval>();

  async save(approval: ChangeStageApproval): Promise<void> {
    if (this.#entries.has(approval.id)) {
      throw new Error(`ChangeStageApproval '${approval.id}' already exists and is immutable.`);
    }
    this.#entries.set(approval.id, approval);
  }

  async findById(id: string): Promise<ChangeStageApproval | null> {
    return this.#entries.get(id) ?? null;
  }

  async findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeStageApproval>> {
    return [...this.#entries.values()].filter((entry) => entry.changeId === changeId);
  }
}
