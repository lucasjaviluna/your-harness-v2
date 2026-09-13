export type VerificationOutcome =
  | "verified"
  | "failed"
  | "inconclusive"
  | "requires-human-review";

export interface VerificationCriterionResult {
  readonly criterionId: string;
  readonly outcome: VerificationOutcome;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly summary: string;
}

/** Evaluación auditable de un plan; no autoriza transiciones de WorkItem. */
export interface VerificationReport {
  readonly id: string;
  readonly planId: string;
  readonly specificationId: string;
  readonly outcome: VerificationOutcome;
  readonly criteria: ReadonlyArray<VerificationCriterionResult>;
  readonly createdAt: string;
}
