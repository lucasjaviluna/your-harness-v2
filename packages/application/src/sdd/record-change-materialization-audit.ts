import { createChangeMaterializationAudit, type ChangeMaterializationAudit } from "./change-materialization-audit.js";
import type { ChangeMaterializationAuditRepository } from "./change-materialization-audit-repository.js";

/** Persiste el resultado de apply sin mutar el handoff revisado. */
export class RecordChangeMaterializationAuditUseCase {
  constructor(private readonly audits: ChangeMaterializationAuditRepository) {}

  async execute(input: ChangeMaterializationAudit): Promise<ChangeMaterializationAudit> {
    const existing = await this.audits.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      const sameRequest = existing.handoffId === input.handoffId
        && existing.changeId === input.changeId
        && existing.baseContentDigest === input.baseContentDigest
        && existing.materializedContentDigest === input.materializedContentDigest
        && existing.strategy === input.strategy;
      if (!sameRequest) throw new Error(`Idempotency key '${input.idempotencyKey}' was already used for a different materialization request.`);
      return existing;
    }
    const audit = createChangeMaterializationAudit(input);
    await this.audits.save(audit);
    return audit;
  }
}
