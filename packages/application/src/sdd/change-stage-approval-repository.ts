import type { ChangeStageApproval } from "./change-stage-approval.js";

export interface ChangeStageApprovalRepository {
  save(approval: ChangeStageApproval): Promise<void>;
  findById(id: string): Promise<ChangeStageApproval | null>;
  findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeStageApproval>>;
}
