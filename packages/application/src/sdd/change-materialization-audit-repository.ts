import type { ChangeMaterializationAudit } from "./change-materialization-audit.js";

export interface ChangeMaterializationAuditRepository {
  save(audit: ChangeMaterializationAudit): Promise<void>;
  findByIdempotencyKey(idempotencyKey: string): Promise<ChangeMaterializationAudit | undefined>;
  findByAttemptId(attemptId: string): Promise<ChangeMaterializationAudit | undefined>;
  findByHandoffId(handoffId: string): Promise<ReadonlyArray<ChangeMaterializationAudit>>;
  findCurrentByChangeId(changeId: string): Promise<ChangeMaterializationAudit | undefined>;
}
