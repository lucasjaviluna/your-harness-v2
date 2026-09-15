import type { SddProvenance } from "./sdd-provider.js";
import type { ChangeApplyStatus } from "./change-apply-policy.js";

export interface ChangeApplyTransitionRecord {
  readonly id: string;
  readonly changeId: string;
  readonly handoffId: string;
  readonly attemptId: string;
  readonly idempotencyKey: string;
  readonly fromStatus?: ChangeApplyStatus;
  readonly toStatus: ChangeApplyStatus;
  readonly changeVersion: string;
  readonly changeDigest: string;
  readonly provenance: SddProvenance;
  readonly changedBy: string;
  readonly changedByRole: string;
  readonly reason: string;
  readonly changedAt: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`ChangeApplyTransitionRecord ${field} cannot be empty.`);
};

export const createChangeApplyTransitionRecord = (input: ChangeApplyTransitionRecord): ChangeApplyTransitionRecord => {
  nonEmpty(input.id, "id");
  nonEmpty(input.changeId, "change id");
  nonEmpty(input.handoffId, "handoff id");
  nonEmpty(input.attemptId, "attempt id");
  nonEmpty(input.idempotencyKey, "idempotency key");
  nonEmpty(input.changeVersion, "change version");
  nonEmpty(input.changeDigest, "change digest");
  nonEmpty(input.provenance.providerId, "provenance provider id");
  nonEmpty(input.provenance.reference, "provenance reference");
  nonEmpty(input.changedBy, "changed by");
  nonEmpty(input.changedByRole, "changed by role");
  nonEmpty(input.reason, "reason");
  nonEmpty(input.changedAt, "changed at");
  return { ...input, provenance: { ...input.provenance } };
};
