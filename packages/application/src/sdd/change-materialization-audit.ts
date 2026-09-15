import type { SddProvenance } from "./sdd-provider.js";

export type ChangeMaterializationOutcome = "succeeded" | "failed";

/** Evento inmutable de una operación apply sobre un handoff concreto. */
export interface ChangeMaterializationAudit {
  readonly id: string;
  readonly handoffId: string;
  readonly changeId: string;
  readonly providerId: string;
  readonly provenance: SddProvenance;
  readonly strategy: string;
  readonly baseVersion?: string;
  readonly baseContentDigest?: string;
  readonly materializedVersion: string;
  readonly materializedContentDigest: string;
  readonly outcome: ChangeMaterializationOutcome;
  readonly actor: string;
  readonly actorRole: string;
  readonly error?: string;
  readonly occurredAt: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`ChangeMaterializationAudit ${field} cannot be empty.`);
};

export const createChangeMaterializationAudit = (input: ChangeMaterializationAudit): ChangeMaterializationAudit => {
  nonEmpty(input.id, "id");
  nonEmpty(input.handoffId, "handoff id");
  nonEmpty(input.changeId, "change id");
  nonEmpty(input.providerId, "provider id");
  nonEmpty(input.provenance.reference, "provenance reference");
  nonEmpty(input.strategy, "strategy");
  nonEmpty(input.materializedVersion, "materialized version");
  nonEmpty(input.materializedContentDigest, "materialized content digest");
  nonEmpty(input.actor, "actor");
  nonEmpty(input.actorRole, "actor role");
  nonEmpty(input.occurredAt, "occurredAt");
  if (input.outcome === "failed" && !input.error?.trim()) throw new Error("Failed materialization audit requires an error.");
  return { ...input, provenance: { ...input.provenance } };
};
