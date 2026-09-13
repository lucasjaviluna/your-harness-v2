import type { EvidenceKind, EvidenceSubject } from "./evidence.js";

export interface VerificationCriterion {
  readonly id: string;
  readonly subject: Exclude<EvidenceSubject, { readonly kind: "artifact" }>;
  readonly expectedEvidenceKinds: ReadonlyArray<EvidenceKind>;
}

/** Criterios seleccionados sobre comportamiento ya aprobado. */
export interface VerificationPlan {
  readonly id: string;
  readonly executionTraceId: string;
  readonly specificationId: string;
  readonly specificationSnapshotDigest: string;
  readonly criteria: ReadonlyArray<VerificationCriterion>;
  readonly createdAt: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`VerificationPlan ${field} cannot be empty.`);
};

export const createVerificationPlan = (input: VerificationPlan): VerificationPlan => {
  nonEmpty(input.id, "id");
  nonEmpty(input.executionTraceId, "execution trace id");
  nonEmpty(input.specificationId, "specification id");
  nonEmpty(input.specificationSnapshotDigest, "specification snapshot digest");
  nonEmpty(input.createdAt, "createdAt");
  if (input.criteria.length === 0) throw new Error("VerificationPlan requires at least one criterion.");
  const ids = new Set(input.criteria.map((criterion) => criterion.id));
  if (ids.size !== input.criteria.length) throw new Error("VerificationPlan cannot contain duplicate criteria.");
  input.criteria.forEach((criterion) => {
    nonEmpty(criterion.id, "criterion id");
    if (criterion.subject.kind === "requirement") nonEmpty(criterion.subject.requirementId, "requirement id");
    else nonEmpty(criterion.subject.scenarioId, "scenario id");
    if (criterion.expectedEvidenceKinds.length === 0) {
      throw new Error(`VerificationPlan criterion '${criterion.id}' requires expected evidence kinds.`);
    }
  });
  return { ...input, criteria: input.criteria.map((criterion) => ({ ...criterion, subject: { ...criterion.subject }, expectedEvidenceKinds: [...criterion.expectedEvidenceKinds] })) };
};
