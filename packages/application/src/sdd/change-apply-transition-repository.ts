import type { ChangeApplyTransitionRecord } from "./change-apply-transition.js";

export interface ChangeApplyTransitionRepository {
  save(record: ChangeApplyTransitionRecord): Promise<void>;
  findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeApplyTransitionRecord>>;
  findCurrentByChangeId(changeId: string): Promise<ChangeApplyTransitionRecord | undefined>;
  findByAttemptId(attemptId: string): Promise<ReadonlyArray<ChangeApplyTransitionRecord>>;
}
