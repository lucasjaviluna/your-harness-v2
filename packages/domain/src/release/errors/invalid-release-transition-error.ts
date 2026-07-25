import { DomainError } from "@your-harness/shared";

import { ReleaseStatus } from "../release-status.js";

/**
 * Thrown when an invalid Release state transition is attempted.
 */
export class InvalidReleaseTransitionError extends DomainError {
  constructor(
    from: ReleaseStatus,
    to: ReleaseStatus
  ) {
    super(
      `Cannot transition Release from "${from}" to "${to}".`
    );
  }
}
