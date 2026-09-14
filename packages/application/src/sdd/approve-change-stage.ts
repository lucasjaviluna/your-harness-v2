import { createChangeStageApproval, type ChangeStageApproval } from "./change-stage-approval.js";
import { createChangeStageApprovalPolicy, type ChangeStageApprovalPolicy } from "./change-stage-approval-policy.js";
import type { ChangeStageApprovalRepository } from "./change-stage-approval-repository.js";

/** Caso de uso único para registrar una decisión HITM sobre una etapa. */
export class ApproveChangeStageUseCase {
  constructor(
    private readonly approvals: ChangeStageApprovalRepository,
    private readonly policy: ChangeStageApprovalPolicy = createChangeStageApprovalPolicy(),
  ) {}

  async execute(input: ChangeStageApproval): Promise<ChangeStageApproval> {
    const approval = createChangeStageApproval(input);
    const existing = await this.approvals.findByChangeId(approval.changeId);

    if (approval.decision === "approve") {
      const evaluation = this.policy.evaluate({
        changeId: approval.changeId,
        stage: approval.stage,
        changeVersion: approval.changeVersion,
        changeDigest: approval.changeDigest,
        approvals: [...existing, approval],
      });
      if (!evaluation.allowed) {
        throw new Error(`Change stage '${approval.stage}' cannot advance: ${evaluation.reasons.join(" ")}`);
      }
    }

    await this.approvals.save(approval);
    return approval;
  }
}
