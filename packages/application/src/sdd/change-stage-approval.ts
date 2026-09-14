export type ChangeStage =
  | "proposal"
  | "design"
  | "task-plan"
  | "apply-readiness"
  | "verification-completion";

export type ChangeStageApprovalDecision =
  | "approve"
  | "request-rework"
  | "reject";

export type ChangeStageApprovalRole = "engineer" | "reviewer" | "maintainer" | "owner";

/**
 * Decisión HITM inmutable sobre una etapa concreta de un Change.
 *
 * La aprobación se liga a una versión y digest para que cualquier cambio
 * posterior pueda invalidar las etapas dependientes.
 */
export interface ChangeStageApproval {
  readonly id: string;
  readonly changeId: string;
  readonly stage: ChangeStage;
  readonly changeVersion: string;
  readonly changeDigest: string;
  readonly decision: ChangeStageApprovalDecision;
  readonly approvedBy: string;
  readonly approvedByRole: ChangeStageApprovalRole;
  readonly reason: string;
  readonly approvedAt: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`ChangeStageApproval ${field} cannot be empty.`);
};

export const createChangeStageApproval = (
  input: ChangeStageApproval,
): ChangeStageApproval => {
  nonEmpty(input.id, "id");
  nonEmpty(input.changeId, "change id");
  nonEmpty(input.stage, "stage");
  nonEmpty(input.changeVersion, "change version");
  nonEmpty(input.changeDigest, "change digest");
  nonEmpty(input.approvedBy, "approvedBy");
  nonEmpty(input.approvedByRole, "approvedByRole");
  nonEmpty(input.reason, "reason");
  nonEmpty(input.approvedAt, "approvedAt");
  return { ...input };
};
