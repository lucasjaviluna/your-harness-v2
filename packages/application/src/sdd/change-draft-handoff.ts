import type { SddProvenance } from "./sdd-provider.js";

export type ChangeDraftHandoffStatus =
  | "draft"
  | "ready-for-review"
  | "in-review"
  | "approved"
  | "superseded"
  | "materialized"
  | "rejected";

export type ChangeDraftHandoffOrigin = "agent" | "user";

/** Snapshot durable entre la generación de un Change y su revisión HITM. */
export interface ChangeDraftHandoff {
  readonly id: string;
  readonly changeId: string;
  readonly status: ChangeDraftHandoffStatus;
  readonly providerId: string;
  readonly provenance: SddProvenance;
  readonly origin: ChangeDraftHandoffOrigin;
  readonly baseVersion?: string;
  readonly baseContentDigest?: string;
  readonly proposedVersion: string;
  readonly proposedContentDigest: string;
  readonly proposal: string;
  readonly design: string;
  readonly tasks: string;
  readonly createdBy: string;
  readonly createdByRole: string;
  readonly createdAt: string;
  readonly supersedesHandoffId?: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`ChangeDraftHandoff ${field} cannot be empty.`);
};

export const createChangeDraftHandoff = (input: ChangeDraftHandoff): ChangeDraftHandoff => {
  nonEmpty(input.id, "id");
  nonEmpty(input.changeId, "change id");
  nonEmpty(input.providerId, "provider id");
  nonEmpty(input.provenance.reference, "provenance reference");
  nonEmpty(input.proposedVersion, "proposed version");
  nonEmpty(input.proposedContentDigest, "proposed content digest");
  nonEmpty(input.createdBy, "createdBy");
  nonEmpty(input.createdByRole, "createdByRole");
  nonEmpty(input.createdAt, "createdAt");
  if (input.supersedesHandoffId === input.id) throw new Error("ChangeDraftHandoff cannot supersede itself.");
  return { ...input, provenance: { ...input.provenance } };
};
