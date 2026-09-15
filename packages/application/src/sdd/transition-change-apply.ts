import { createChangeApplyTransitionRecord, type ChangeApplyTransitionRecord } from "./change-apply-transition.js";
import type { ChangeApplyTransitionRepository } from "./change-apply-transition-repository.js";
import { evaluateChangeApplyTransition } from "./change-apply-policy.js";

export interface TransitionChangeApplyInput extends Omit<ChangeApplyTransitionRecord, "fromStatus" | "toStatus"> {
  readonly requestedStatus: ChangeApplyTransitionRecord["toStatus"];
}

export class TransitionChangeApplyUseCase {
  constructor(private readonly transitions: ChangeApplyTransitionRepository) {}

  async execute(input: TransitionChangeApplyInput): Promise<ChangeApplyTransitionRecord> {
    const current = await this.transitions.findCurrentByChangeId(input.changeId);
    const evaluation = evaluateChangeApplyTransition({ currentStatus: current?.toStatus, requestedStatus: input.requestedStatus });
    if (!evaluation.allowed) throw new Error(`Change Apply '${input.changeId}' cannot transition: ${evaluation.reasons.join(" ")}`);
    const record = createChangeApplyTransitionRecord({ ...input, fromStatus: current?.toStatus, toStatus: input.requestedStatus });
    await this.transitions.save(record);
    return record;
  }
}
