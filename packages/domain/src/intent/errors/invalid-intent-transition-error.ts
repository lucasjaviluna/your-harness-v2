import { DomainError } from "@your-harness/shared";

import { IntentStatus } from "../intent-status.js";

/**
 * Thrown when an invalid Intent state transition is attempted.
 */
export class InvalidIntentTransitionError extends DomainError {
  constructor(
    from: IntentStatus,
    to: IntentStatus
  ) {
    super(
      `Cannot transition Intent from "${from}" to "${to}".`
    );
  }
}
