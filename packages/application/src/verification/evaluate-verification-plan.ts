import type { Evidence, EvidenceSubject } from "./evidence.js";
import type { VerificationCriterion, VerificationPlan } from "./verification-plan.js";
import type {
  VerificationCriterionResult,
  VerificationOutcome,
  VerificationReport,
} from "./verification-report.js";

export interface EvaluateVerificationPlanInput {
  readonly plan: VerificationPlan;
  readonly evidence: ReadonlyArray<Evidence>;
  readonly reportId: string;
  readonly createdAt: string;
}

const sameSubject = (left: EvidenceSubject, right: VerificationCriterion["subject"]): boolean => {
  if (left.kind !== right.kind) return false;
  if (left.kind === "requirement" && right.kind === "requirement") {
    return left.requirementId === right.requirementId;
  }
  if (left.kind === "scenario" && right.kind === "scenario") {
    return left.scenarioId === right.scenarioId;
  }
  return false;
};

const evaluateCriterion = (
  criterion: VerificationCriterion,
  evidence: ReadonlyArray<Evidence>,
): VerificationCriterionResult => {
  const matching = evidence.filter(
    (item) => sameSubject(item.subject, criterion.subject) && criterion.expectedEvidenceKinds.includes(item.kind),
  );
  const evidenceIds = matching.map((item) => item.id);

  if (matching.some((item) => item.outcome === "failed")) {
    return { criterionId: criterion.id, outcome: "failed", evidenceIds, summary: "Matching evidence contains a failed observation." };
  }

  const missingKinds = criterion.expectedEvidenceKinds.filter(
    (kind) => !matching.some((item) => item.kind === kind),
  );
  if (missingKinds.length > 0) {
    return { criterionId: criterion.id, outcome: "inconclusive", evidenceIds, summary: `Missing expected evidence kinds: ${missingKinds.join(", ")}.` };
  }

  if (matching.some((item) => item.outcome === "inconclusive")) {
    return { criterionId: criterion.id, outcome: "inconclusive", evidenceIds, summary: "Matching evidence is inconclusive." };
  }

  if (matching.some((item) => item.kind === "review-note" || item.kind === "attestation")) {
    return { criterionId: criterion.id, outcome: "requires-human-review", evidenceIds, summary: "Review or attestation evidence requires explicit human review." };
  }

  return { criterionId: criterion.id, outcome: "verified", evidenceIds, summary: "All expected evidence kinds passed." };
};

const reportOutcome = (results: ReadonlyArray<VerificationCriterionResult>): VerificationOutcome => {
  if (results.some((result) => result.outcome === "failed")) return "failed";
  if (results.some((result) => result.outcome === "requires-human-review")) return "requires-human-review";
  if (results.some((result) => result.outcome === "inconclusive")) return "inconclusive";
  return "verified";
};

/** Evaluador determinista y conservador; no autoriza ni muta aggregates. */
export const evaluateVerificationPlan = (
  input: EvaluateVerificationPlanInput,
): VerificationReport => {
  if (!input.reportId.trim()) throw new Error("VerificationReport id cannot be empty.");
  if (!input.createdAt.trim()) throw new Error("VerificationReport createdAt cannot be empty.");
  const criteria = input.plan.criteria.map((criterion) => evaluateCriterion(criterion, input.evidence));
  return {
    id: input.reportId,
    planId: input.plan.id,
    specificationId: input.plan.specificationId,
    outcome: reportOutcome(criteria),
    criteria,
    createdAt: input.createdAt,
  };
};
