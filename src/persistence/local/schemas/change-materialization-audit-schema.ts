import { z } from "zod";

export const changeMaterializationAuditSchema = z.object({
  id: z.string().min(1), attemptId: z.string().min(1), idempotencyKey: z.string().min(1), retryOfAttemptId: z.string().optional(), handoffId: z.string().min(1), changeId: z.string().min(1), providerId: z.string().min(1),
  provenance: z.object({ providerId: z.string().min(1), reference: z.string().min(1) }),
  strategy: z.string().min(1), baseVersion: z.string().optional(), baseContentDigest: z.string().optional(),
  materializedVersion: z.string().min(1), materializedContentDigest: z.string().min(1),
  outcome: z.enum(["succeeded", "failed"]), actor: z.string().min(1), actorRole: z.string().min(1),
  error: z.string().optional(), occurredAt: z.string().min(1),
});
