import type { SddProvenance } from "./sdd-provider.js";
import { GovernedChangeStatus } from "./sdd-lifecycle-status.js";

export interface GovernedChangeRecord {
  readonly id: string;
  readonly changeId: string;
  readonly status: GovernedChangeStatus;
  readonly previousStatus?: GovernedChangeStatus;
  readonly changeVersion: string;
  readonly changeDigest: string;
  readonly provenance: SddProvenance;
  readonly changedBy: string;
  readonly changedByRole: string;
  readonly reason: string;
  readonly changedAt: string;
  readonly completionAuthorized?: boolean;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`GovernedChangeRecord ${field} cannot be empty.`);
};

export const createGovernedChangeRecord = (input: GovernedChangeRecord): GovernedChangeRecord => {
  nonEmpty(input.id, "id");
  nonEmpty(input.changeId, "change id");
  nonEmpty(input.changeVersion, "change version");
  nonEmpty(input.changeDigest, "change digest");
  nonEmpty(input.provenance.providerId, "provenance provider id");
  nonEmpty(input.provenance.reference, "provenance reference");
  nonEmpty(input.changedBy, "changedBy");
  nonEmpty(input.changedByRole, "changedByRole");
  nonEmpty(input.reason, "reason");
  nonEmpty(input.changedAt, "changedAt");
  return { ...input, provenance: { ...input.provenance } };
};
