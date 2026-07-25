import { AggregateRoot } from "@your-harness/shared";

import { SpecificationId } from "./specification-id.js";
import { SpecificationStatus } from "./specification-status.js";
import { SpecificationTitle } from "./specification-title.js";
import { InvalidSpecificationTransitionError } from "./errors/index.js";


/**
 * Represents an engineering specification.
 *
 * A Specification defines knowledge that becomes part of the
 * project's source of truth.
 */
export class Specification extends AggregateRoot<SpecificationId> {
  readonly #title: SpecificationTitle;
  readonly #status: SpecificationStatus;

  constructor(
    id: SpecificationId,
    title: SpecificationTitle,
    status: SpecificationStatus = SpecificationStatus.Draft
  ) {
    super(id);

    this.#title = title;
    this.#status = status;
  }

  get title(): SpecificationTitle {
    return this.#title;
  }

  get status(): SpecificationStatus {
    return this.#status;
  }

  rename(title: SpecificationTitle): Specification {
    return new Specification(
      this.id,
      title,
      this.status
    );
  }

  submitForReview(): Specification {
    if (this.status !== SpecificationStatus.Draft) {
    throw new InvalidSpecificationTransitionError(
      this.status,
      SpecificationStatus.InReview
    );
  }

  return new Specification(
    this.id,
    this.title,
    SpecificationStatus.InReview
  );
  }

  approve(): Specification {
  if (this.status !== SpecificationStatus.InReview) {
    throw new InvalidSpecificationTransitionError(
      this.status,
      SpecificationStatus.Approved
    );
  }

  return new Specification(
    this.id,
    this.title,
    SpecificationStatus.Approved
  );
}

  supersede(): Specification {
  if (this.status !== SpecificationStatus.Approved) {
    throw new InvalidSpecificationTransitionError(
      this.status,
      SpecificationStatus.Superseded
    );
  }

  return new Specification(
    this.id,
    this.title,
    SpecificationStatus.Superseded
  );
}

  archive(): Specification {
  if (this.status === SpecificationStatus.Archived) {
    throw new InvalidSpecificationTransitionError(
      this.status,
      SpecificationStatus.Archived
    );
  }

  return new Specification(
    this.id,
    this.title,
    SpecificationStatus.Archived
  );
}
}
