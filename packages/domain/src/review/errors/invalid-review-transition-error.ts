import { DomainError } from "@your-harness/shared";

import { ReviewStatus } from "../review-status.js";

/**
 * Thrown when an invalid Review state transition is attempted.
 */
export class InvalidReviewTransitionError extends DomainError {
  constructor(
    from: ReviewStatus,
    to: ReviewStatus
  ) {
    super(
      `Cannot transition Review from "${from}" to "${to}".`
    );
  }
}
