import { z } from "zod";

export const changeApplyTransitionSchema = z.object({
  id: z.string().min(1), changeId: z.string().min(1), handoffId: z.string().min(1),
  attemptId: z.string().min(1), idempotencyKey: z.string().min(1),
  fromStatus: z.enum(["approved", "apply-ready", "applying", "materialized", "apply-failed"]).optional(),
  toStatus: z.enum(["approved", "apply-ready", "applying", "materialized", "apply-failed"]),
  changeVersion: z.string().min(1), changeDigest: z.string().min(1),
  provenance: z.object({ providerId: z.string().min(1), reference: z.string().min(1) }),
  changedBy: z.string().min(1), changedByRole: z.string().min(1), reason: z.string().min(1), changedAt: z.string().min(1),
});
