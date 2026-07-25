import { AggregateRoot } from "@your-harness/shared";

import { SpecificationId } from "../specification/index.js";

import { ReviewId } from "./review-id.js";
import { ReviewResult } from "./review-result.js";
import { ReviewStatus } from "./review-status.js";
import { InvalidReviewTransitionError } from "./errors/index.js";

/**
 * Represents the formal validation of a Specification.
 *
 * A Review validates engineering knowledge, not source code.
 */
export class Review extends AggregateRoot<ReviewId> {
  readonly #specificationId: SpecificationId;
  readonly #status: ReviewStatus;
  readonly #result?: ReviewResult;

  constructor(
    id: ReviewId,
    specificationId: SpecificationId,
    status: ReviewStatus = ReviewStatus.Pending,
    result?: ReviewResult
  ) {
    super(id);

    this.#specificationId = specificationId;
    this.#status = status;
    this.#result = result;
  }

  get specificationId(): SpecificationId {
    return this.#specificationId;
  }

  get status(): ReviewStatus {
    return this.#status;
  }

  get result(): ReviewResult | undefined {
    return this.#result;
  }

  start(): Review {
  if (this.status !== ReviewStatus.Pending) {
    throw new InvalidReviewTransitionError(
      this.status,
      ReviewStatus.InProgress
    );
  }

  return new Review(
    this.id,
    this.specificationId,
    ReviewStatus.InProgress
  );
}

  approve(): Review {
  if (this.status !== ReviewStatus.InProgress) {
    throw new InvalidReviewTransitionError(
      this.status,
      ReviewStatus.Completed
    );
  }

  return new Review(
    this.id,
    this.specificationId,
    ReviewStatus.Completed,
    ReviewResult.Approved
  );
}

  reject(): Review {
  if (this.status !== ReviewStatus.InProgress) {
    throw new InvalidReviewTransitionError(
      this.status,
      ReviewStatus.Completed
    );
  }

  return new Review(
    this.id,
    this.specificationId,
    ReviewStatus.Completed,
    ReviewResult.Rejected
  );
}

  requestChanges(): Review {
  if (this.status !== ReviewStatus.InProgress) {
    throw new InvalidReviewTransitionError(
      this.status,
      ReviewStatus.Completed
    );
  }

  return new Review(
    this.id,
    this.specificationId,
    ReviewStatus.Completed,
    ReviewResult.ChangesRequested
  );
}

  cancel(): Review {
  if (this.status === ReviewStatus.Completed) {
    throw new InvalidReviewTransitionError(
      this.status,
      ReviewStatus.Cancelled
    );
  }

  return new Review(
    this.id,
    this.specificationId,
    ReviewStatus.Cancelled,
    this.result
  );
}
}
