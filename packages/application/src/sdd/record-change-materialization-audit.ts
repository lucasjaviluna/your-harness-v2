import { createChangeMaterializationAudit, type ChangeMaterializationAudit } from "./change-materialization-audit.js";
import type { ChangeMaterializationAuditRepository } from "./change-materialization-audit-repository.js";

/** Persiste el resultado de apply sin mutar el handoff revisado. */
export class RecordChangeMaterializationAuditUseCase {
  constructor(private readonly audits: ChangeMaterializationAuditRepository) {}

  async execute(input: ChangeMaterializationAudit): Promise<ChangeMaterializationAudit> {
    const audit = createChangeMaterializationAudit(input);
    await this.audits.save(audit);
    return audit;
  }
}
