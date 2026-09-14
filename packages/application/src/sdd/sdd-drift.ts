import type { SddSpecificationSnapshot } from "../trace/execution-trace.js";

export type SddDriftReason = "match" | "missing-approved-digest" | "digest-mismatch";

/** Resultado explicable de comparar el snapshot aprobado con la proyección actual. */
export interface SddDriftReport {
  readonly hasDrift: boolean;
  readonly specificationId: string;
  readonly approvedDigest?: string;
  readonly currentDigest: string;
  readonly reason: SddDriftReason;
}

export const evaluateSddDrift = (input: {
  readonly approvedDigest?: string;
  readonly currentSnapshot: SddSpecificationSnapshot;
}): SddDriftReport => {
  if (!input.approvedDigest) {
    return {
      hasDrift: true,
      specificationId: input.currentSnapshot.id,
      currentDigest: input.currentSnapshot.contentDigest,
      reason: "missing-approved-digest",
    };
  }

  const matches = input.approvedDigest === input.currentSnapshot.contentDigest;
  return {
    hasDrift: !matches,
    specificationId: input.currentSnapshot.id,
    approvedDigest: input.approvedDigest,
    currentDigest: input.currentSnapshot.contentDigest,
    reason: matches ? "match" : "digest-mismatch",
  };
};
