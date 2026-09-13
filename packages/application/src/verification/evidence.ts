import type { SddProvenance } from "../sdd/sdd-provider.js";

export type EvidenceKind =
  | "test-result"
  | "command-result"
  | "artifact-digest"
  | "review-note"
  | "attestation";

export type EvidenceOutcome = "passed" | "failed" | "inconclusive";

export type EvidenceSubject =
  | { readonly kind: "requirement"; readonly requirementId: string }
  | { readonly kind: "scenario"; readonly scenarioId: string }
  | { readonly kind: "artifact"; readonly provenance: SddProvenance };

/** Claim operacional inmutable, inspeccionable y anclado a una ejecución. */
export interface Evidence {
  readonly id: string;
  readonly executionTraceId: string;
  readonly subject: EvidenceSubject;
  readonly kind: EvidenceKind;
  readonly outcome: EvidenceOutcome;
  readonly locator?: string;
  readonly digest?: string;
  readonly summary: string;
  readonly capturedAt: string;
}

export type CreateEvidenceInput = Evidence;

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`Evidence ${field} cannot be empty.`);
};

export const createEvidence = (input: CreateEvidenceInput): Evidence => {
  nonEmpty(input.id, "id");
  nonEmpty(input.executionTraceId, "execution trace id");
  nonEmpty(input.summary, "summary");
  nonEmpty(input.capturedAt, "capturedAt");
  if (input.subject.kind === "requirement") nonEmpty(input.subject.requirementId, "requirement id");
  if (input.subject.kind === "scenario") nonEmpty(input.subject.scenarioId, "scenario id");
  if (input.subject.kind === "artifact") {
    nonEmpty(input.subject.provenance.providerId, "artifact provider id");
    nonEmpty(input.subject.provenance.reference, "artifact reference");
  }
  if (input.locator !== undefined) nonEmpty(input.locator, "locator");
  if (input.digest !== undefined) nonEmpty(input.digest, "digest");

  return {
    ...input,
    subject: input.subject.kind === "artifact"
      ? { kind: "artifact", provenance: { ...input.subject.provenance } }
      : { ...input.subject },
  };
};
