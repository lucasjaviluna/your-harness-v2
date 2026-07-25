import { DomainError } from "@your-harness/shared";

import { SpecificationStatus } from "../specification-status.js";

/**
 * Thrown when an invalid Specification state transition is attempted.
 */
export class InvalidSpecificationTransitionError extends DomainError {
  constructor(
    from: SpecificationStatus,
    to: SpecificationStatus
  ) {
    super(
      `Cannot transition Specification from "${from}" to "${to}".`
    );
  }
}
