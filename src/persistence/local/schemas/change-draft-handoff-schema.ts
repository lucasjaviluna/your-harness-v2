import { z } from "zod";

/** Forma aceptada para un ChangeDraftHandoff rehidratado desde JSON local. */
export const changeDraftHandoffSchema = z.object({
  id: z.string().min(1),
  changeId: z.string().min(1),
  status: z.enum([
    "draft",
    "ready-for-review",
    "in-review",
    "approved",
    "superseded",
    "materialized",
    "rejected",
  ]),
  providerId: z.string().min(1),
  provenance: z.object({
    providerId: z.string().min(1),
    reference: z.string().min(1),
  }),
  origin: z.enum(["agent", "user"]),
  baseVersion: z.string().optional(),
  baseContentDigest: z.string().optional(),
  proposedVersion: z.string().min(1),
  proposedContentDigest: z.string().min(1),
  proposal: z.string(),
  design: z.string(),
  tasks: z.string(),
  createdBy: z.string().min(1),
  createdByRole: z.string().min(1),
  createdAt: z.string().min(1),
  supersedesHandoffId: z.string().optional(),
});
