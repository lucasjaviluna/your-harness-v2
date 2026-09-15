import type { SddProvenance } from "./sdd-provider.js";

export type ChangeMaterializationOutcome = "succeeded" | "failed";

/** Evento inmutable de una operación apply sobre un handoff concreto. */
export interface ChangeMaterializationAudit {
  readonly id: string;
  /** Identificador operacional del intento; normalmente coincide con la operación iniciada por el usuario. */
  readonly attemptId: string;
  /** Clave estable para evitar ejecutar dos veces la misma solicitud lógica. */
  readonly idempotencyKey: string;
  /** Intento anterior que se está reejecutando, si corresponde. */
  readonly retryOfAttemptId?: string;
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
  nonEmpty(input.attemptId, "attempt id");
  nonEmpty(input.idempotencyKey, "idempotency key");
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
  if (input.retryOfAttemptId === input.attemptId) throw new Error("A materialization attempt cannot retry itself.");
  return { ...input, provenance: { ...input.provenance } };
};
