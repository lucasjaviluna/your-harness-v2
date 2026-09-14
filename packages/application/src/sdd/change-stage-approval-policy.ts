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

const approvalsFor = (
  approvals: ReadonlyArray<ChangeStageApproval>,
  changeId: string,
  stage: ChangeStage,
  version: string,
  digest: string,
): ReadonlyArray<ChangeStageApproval> => approvals.filter(
  (approval) => approval.changeId === changeId
    && approval.stage === stage
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
      const stageApprovals = input.approvals.filter((entry) => entry.changeId === input.changeId
        && entry.stage === requiredStage
        && entry.changeVersion === input.changeVersion
        && entry.changeDigest === input.changeDigest);
      const blockingDecision = stageApprovals.find(
        (approval) => approval.decision === "request-rework" || approval.decision === "reject",
      );
      if (blockingDecision) {
        reasons.push(
          `Change stage '${requiredStage}' has a blocking '${blockingDecision.decision}' decision.`,
        );
        continue;
      }
      const approvals = approvalsFor(
        input.approvals,
        input.changeId,
        requiredStage,
        input.changeVersion,
        input.changeDigest,
      );
      if (approvals.length === 0) {
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
