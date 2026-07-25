import { DomainError } from "@your-harness/shared";

import { WorkItemStatus } from "../work-item-status.js";

/**
 * Thrown when an invalid Work Item state transition is attempted.
 */
export class InvalidWorkItemTransitionError extends DomainError {
  constructor(
    from: WorkItemStatus,
    to: WorkItemStatus
  ) {
    super(
      `Cannot transition Work Item from "${from}" to "${to}".`
    );
  }
}
