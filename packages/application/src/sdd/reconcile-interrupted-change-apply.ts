import type { ChangeApplyStatus } from "./change-apply-policy.js";

export type ChangeApplyRecoveryObservation = "already-materialized" | "not-materialized" | "inconsistent";

export interface ReconcileInterruptedChangeApplyInput {
  readonly currentStatus: ChangeApplyStatus;
  readonly currentContentDigest: string;
  readonly baseContentDigest?: string;
  readonly expectedContentDigest: string;
}

export interface ReconcileInterruptedChangeApplyResult {
  readonly observation: ChangeApplyRecoveryObservation;
  readonly recommendedStatus: "materialized" | "apply-failed" | "recovery-required";
  readonly reasons: ReadonlyArray<string>;
}

/** Clasifica el resultado observable sin ejecutar ni modificar el proveedor. */
export const reconcileInterruptedChangeApply = (
  input: ReconcileInterruptedChangeApplyInput,
): ReconcileInterruptedChangeApplyResult => {
  if (input.currentStatus !== "applying") {
    return { observation: "inconsistent", recommendedStatus: "recovery-required", reasons: ["CHANGE_APPLY_NOT_INTERRUPTED"] };
  }
  if (input.currentContentDigest === input.expectedContentDigest) {
    return { observation: "already-materialized", recommendedStatus: "materialized", reasons: [] };
  }
  if (input.baseContentDigest && input.currentContentDigest === input.baseContentDigest) {
    return { observation: "not-materialized", recommendedStatus: "apply-failed", reasons: [] };
  }
  return { observation: "inconsistent", recommendedStatus: "recovery-required", reasons: ["CHANGE_APPLY_PROVIDER_STATE_INCONSISTENT"] };
};
