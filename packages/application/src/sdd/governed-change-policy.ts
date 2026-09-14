import { GovernedChangeStatus } from "./sdd-lifecycle-status.js";

export interface GovernedChangeTransitionInput {
  readonly currentStatus?: GovernedChangeStatus;
  readonly requestedStatus: GovernedChangeStatus;
  readonly completionAuthorized?: boolean;
}

export interface GovernedChangeTransitionEvaluation {
  readonly allowed: boolean;
  readonly reasons: ReadonlyArray<string>;
}

const transitions: Record<GovernedChangeStatus, ReadonlyArray<GovernedChangeStatus>> = {
  [GovernedChangeStatus.Proposed]: [GovernedChangeStatus.Approved, GovernedChangeStatus.Withdrawn],
  [GovernedChangeStatus.Approved]: [GovernedChangeStatus.Executing, GovernedChangeStatus.Withdrawn],
  [GovernedChangeStatus.Executing]: [GovernedChangeStatus.VerificationPending, GovernedChangeStatus.Withdrawn],
  [GovernedChangeStatus.VerificationPending]: [GovernedChangeStatus.Completed, GovernedChangeStatus.Withdrawn],
  [GovernedChangeStatus.Completed]: [],
  [GovernedChangeStatus.Withdrawn]: [],
};

export const evaluateGovernedChangeTransition = (
  input: GovernedChangeTransitionInput,
): GovernedChangeTransitionEvaluation => {
  if (!input.currentStatus) {
    return input.requestedStatus === GovernedChangeStatus.Proposed
      ? { allowed: true, reasons: [] }
      : { allowed: false, reasons: ["GOVERNED_CHANGE_MUST_START_PROPOSED"] };
  }
  if (input.currentStatus === input.requestedStatus) {
    return { allowed: false, reasons: ["GOVERNED_CHANGE_SAME_STATUS"] };
  }
  if (!transitions[input.currentStatus].includes(input.requestedStatus)) {
    return { allowed: false, reasons: ["GOVERNED_CHANGE_INVALID_TRANSITION"] };
  }
  if (input.requestedStatus === GovernedChangeStatus.Completed && !input.completionAuthorized) {
    return { allowed: false, reasons: ["GOVERNED_CHANGE_COMPLETION_AUTHORIZATION_REQUIRED"] };
  }
  return { allowed: true, reasons: [] };
};
