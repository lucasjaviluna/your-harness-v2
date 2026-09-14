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

export interface InvalidatedChangeStageApproval {
  readonly approvalId: string;
  readonly stage: ChangeStage;
  readonly reason: "version-mismatch" | "digest-mismatch";
}

/** Proyección explícita de aprobaciones que ya no son aplicables al snapshot actual. */
export const findInvalidatedChangeStageApprovals = (input: {
  readonly changeId: string;
  readonly changeVersion: string;
  readonly changeDigest: string;
  readonly approvals: ReadonlyArray<ChangeStageApproval>;
}): ReadonlyArray<InvalidatedChangeStageApproval> => input.approvals
  .filter((approval) => approval.changeId === input.changeId && approval.decision === "approve")
  .filter((approval) => approval.changeVersion !== input.changeVersion || approval.changeDigest !== input.changeDigest)
  .map((approval) => ({
    approvalId: approval.id,
    stage: approval.stage,
    reason: approval.changeVersion !== input.changeVersion ? "version-mismatch" : "digest-mismatch",
  }));

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
        const invalidated = findInvalidatedChangeStageApprovals({
          changeId: input.changeId,
          changeVersion: input.changeVersion,
          changeDigest: input.changeDigest,
          approvals: input.approvals,
        }).filter((approval) => approval.stage === requiredStage);
        if (invalidated.length > 0) {
          reasons.push(
            `Change stage '${requiredStage}' approval is stale for version '${input.changeVersion}' and digest '${input.changeDigest}'.`,
          );
          continue;
        }
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
