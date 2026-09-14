import type { ChangeStage, ChangeStageApproval } from "./change-stage-approval.js";

const stageOrder: ReadonlyArray<ChangeStage> = [
  "proposal",
  "design",
  "task-plan",
  "apply-readiness",
  "verification-completion",
];

export interface ChangeStageApprovalEvaluation {
  readonly allowed: boolean;
  readonly changeId: string;
  readonly stage: ChangeStage;
  readonly reasons: ReadonlyArray<string>;
}

export interface ChangeStageApprovalPolicy {
  evaluate(input: {
    readonly changeId: string;
    readonly stage: ChangeStage;
    readonly changeVersion: string;
    readonly changeDigest: string;
    readonly approvals: ReadonlyArray<ChangeStageApproval>;
  }): ChangeStageApprovalEvaluation;
}

const approvalFor = (
  approvals: ReadonlyArray<ChangeStageApproval>,
  stage: ChangeStage,
  version: string,
  digest: string,
): ChangeStageApproval | undefined => approvals.find(
  (approval) => approval.stage === stage
    && approval.decision === "approve"
    && approval.changeVersion === version
    && approval.changeDigest === digest,
);

export const createChangeStageApprovalPolicy = (): ChangeStageApprovalPolicy => ({
  evaluate(input) {
    const currentIndex = stageOrder.indexOf(input.stage);
    const reasons: string[] = [];

    if (currentIndex === -1) {
      reasons.push(`Unknown Change stage '${input.stage}'.`);
    }

    const requiredStages = currentIndex === -1 ? [] : stageOrder.slice(0, currentIndex + 1);
    for (const requiredStage of requiredStages) {
      const approval = approvalFor(
        input.approvals.filter((entry) => entry.changeId === input.changeId),
        requiredStage,
        input.changeVersion,
        input.changeDigest,
      );
      if (!approval) {
        reasons.push(
          `Change stage '${requiredStage}' has no approval for version '${input.changeVersion}' and digest '${input.changeDigest}'.`,
        );
      }
    }

    return {
      allowed: reasons.length === 0,
      changeId: input.changeId,
      stage: input.stage,
      reasons,
    };
  },
});
