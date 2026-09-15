/** Estados operativos del intento de materialización, separados del lifecycle SDD. */
export type ChangeApplyStatus = "approved" | "apply-ready" | "applying" | "materialized" | "apply-failed" | "recovery-required";

export interface ChangeApplyTransitionInput {
  readonly currentStatus?: ChangeApplyStatus;
  readonly requestedStatus: ChangeApplyStatus;
}

export interface ChangeApplyTransitionEvaluation {
  readonly allowed: boolean;
  readonly reasons: ReadonlyArray<string>;
}

const transitions: Record<ChangeApplyStatus, ReadonlyArray<ChangeApplyStatus>> = {
  approved: ["apply-ready"],
  "apply-ready": ["applying"],
  applying: ["materialized", "apply-failed", "recovery-required"],
  materialized: [],
  "apply-failed": ["applying"],
  "recovery-required": ["materialized", "apply-failed"],
};

/**
 * Valida la secuencia operacional de Apply sin inferir aprobaciones HITM.
 * Un retry sólo puede comenzar desde apply-failed y debe registrarse como otro intento.
 */
export const evaluateChangeApplyTransition = (
  input: ChangeApplyTransitionInput,
): ChangeApplyTransitionEvaluation => {
  if (!input.currentStatus) {
    return input.requestedStatus === "approved"
      ? { allowed: true, reasons: [] }
      : { allowed: false, reasons: ["CHANGE_APPLY_STATUS_MUST_START_APPROVED"] };
  }
  if (input.currentStatus === input.requestedStatus) return { allowed: false, reasons: ["CHANGE_APPLY_SAME_STATUS"] };
  if (!transitions[input.currentStatus].includes(input.requestedStatus)) {
    return { allowed: false, reasons: ["CHANGE_APPLY_INVALID_TRANSITION"] };
  }
  return { allowed: true, reasons: [] };
};
