import { createGovernedChangeRecord, type GovernedChangeRecord } from "./governed-change.js";
import type { GovernedChangeRepository } from "./governed-change-repository.js";
import { evaluateGovernedChangeTransition } from "./governed-change-policy.js";
import { GovernedChangeStatus } from "./sdd-lifecycle-status.js";

export interface TransitionGovernedChangeInput {
  readonly id: string;
  readonly changeId: string;
  readonly requestedStatus: GovernedChangeStatus;
  readonly changeVersion: string;
  readonly changeDigest: string;
  readonly provenance: GovernedChangeRecord["provenance"];
  readonly changedBy: string;
  readonly changedByRole: string;
  readonly reason: string;
  readonly changedAt: string;
  readonly completionAuthorized?: boolean;
}

export class TransitionGovernedChangeUseCase {
  constructor(private readonly changes: GovernedChangeRepository) {}

  async execute(input: TransitionGovernedChangeInput): Promise<GovernedChangeRecord> {
    const current = await this.changes.findCurrentByChangeId(input.changeId);
    const evaluation = evaluateGovernedChangeTransition({
      currentStatus: current?.status,
      requestedStatus: input.requestedStatus,
      completionAuthorized: input.completionAuthorized,
    });
    if (!evaluation.allowed) {
      throw new Error(`Governed Change '${input.changeId}' cannot transition: ${evaluation.reasons.join(" ")}`);
    }
    const record = createGovernedChangeRecord({
      ...input,
      status: input.requestedStatus,
      previousStatus: current?.status,
    });
    await this.changes.save(record);
    return record;
  }
}
