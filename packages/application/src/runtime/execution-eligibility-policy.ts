import { SpecificationStatus } from "@your-harness/domain";
import type { Specification } from "@your-harness/domain";

import type { SddChangeReference } from "../trace/execution-trace.js";

export type ExecutionIneligibilityReason =
  | "SPECIFICATION_NOT_APPROVED"
  | "SDD_CHANGE_TRACEABILITY_REQUIRED";

export interface ExecutionEligibilityInput {
  readonly specification: Specification;
  readonly traceability?: {
    readonly change?: SddChangeReference;
  };
}

export interface ExecutionEligibilityDecision {
  readonly eligible: boolean;
  readonly reasons: ReadonlyArray<ExecutionIneligibilityReason>;
}

export interface ExecutionEligibilityPolicy {
  evaluate(input: ExecutionEligibilityInput): ExecutionEligibilityDecision;
}

export interface ExecutionEligibilityPolicyOptions {
  /** Requiere una referencia neutral a Change antes de ejecutar. */
  readonly requireSddChangeTraceability?: boolean;
}

/**
 * Guardrail de Application previo a la construcción de ExecutionRequest.
 * Nunca autoriza transiciones de aggregates ni interpreta RuntimeResult.
 */
export const createExecutionEligibilityPolicy = (
  options: ExecutionEligibilityPolicyOptions = {},
): ExecutionEligibilityPolicy => ({
  evaluate(input) {
    const reasons: ExecutionIneligibilityReason[] = [];

    if (input.specification.status !== SpecificationStatus.Approved) {
      reasons.push("SPECIFICATION_NOT_APPROVED");
    }
    if (options.requireSddChangeTraceability && !input.traceability?.change) {
      reasons.push("SDD_CHANGE_TRACEABILITY_REQUIRED");
    }

    return { eligible: reasons.length === 0, reasons };
  },
});
