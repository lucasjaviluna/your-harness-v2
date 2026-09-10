import { AggregateRoot } from "@your-harness/shared";

import { SpecificationId } from "./specification-id.js";
import { SpecificationStatus } from "./specification-status.js";
import { SpecificationTitle } from "./specification-title.js";
import { Requirement } from "./requirement.js";
import { RequirementId } from "./requirement-id.js";
import { InvalidSpecificationTransitionError } from "./errors/index.js";

/**
 * Represents an engineering specification.
 *
 * A Specification defines knowledge that becomes part of the
 * project's source of truth, containing structured Requirements
 * each with their Scenarios.
 *
 * Conceptually:
 * ```text
 * Specification
 *     |
 *     +-- Requirement
 *     |      |
 *     |      +-- Scenario
 *     |      +-- Scenario
 *     |
 *     +-- Requirement
 *            |
 *            +-- Scenario
 * ```
 */
export class Specification extends AggregateRoot<SpecificationId> {
  readonly #title: SpecificationTitle;
  readonly #status: SpecificationStatus;
  readonly #requirements: ReadonlyArray<Requirement>;

  constructor(
    id: SpecificationId,
    title: SpecificationTitle,
    status: SpecificationStatus = SpecificationStatus.Draft,
    requirements: ReadonlyArray<Requirement> = []
  ) {
    super(id);

    this.#title = title;
    this.#status = status;
    this.#requirements = requirements;
  }

  get title(): SpecificationTitle {
    return this.#title;
  }

  get status(): SpecificationStatus {
    return this.#status;
  }

  get requirements(): ReadonlyArray<Requirement> {
    return this.#requirements;
  }

  rename(title: SpecificationTitle): Specification {
    return new Specification(
      this.id,
      title,
      this.status,
      this.#requirements
    );
  }

  addRequirement(requirement: Requirement): Specification {
    this.ensureDraft();

    if (this.#requirements.some((r) => r.id.equals(requirement.id))) {
      throw new Error(`Requirement with id ${requirement.id.value} already exists.`);
    }

    return new Specification(
      this.id,
      this.#title,
      this.#status,
      [...this.#requirements, requirement]
    );
  }

  removeRequirement(requirementId: RequirementId): Specification {
    this.ensureDraft();

    return new Specification(
      this.id,
      this.#title,
      this.#status,
      this.#requirements.filter((r) => !r.id.equals(requirementId))
    );
  }

  updateRequirement(requirement: Requirement): Specification {
    this.ensureDraft();

    return new Specification(
      this.id,
      this.#title,
      this.#status,
      this.#requirements.map((r) => (r.id.equals(requirement.id) ? requirement : r))
    );
  }

  submitForReview(): Specification {
    if (this.status !== SpecificationStatus.Draft) {
      throw new InvalidSpecificationTransitionError(
        this.status,
        SpecificationStatus.InReview
      );
    }

    if (this.#requirements.length === 0) {
      throw new Error("Cannot submit specification for review: it must have at least one requirement.");
    }

    return new Specification(
      this.id,
      this.title,
      SpecificationStatus.InReview,
      this.#requirements
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
      SpecificationStatus.Approved,
      this.#requirements
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
      SpecificationStatus.Superseded,
      this.#requirements
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
      SpecificationStatus.Archived,
      this.#requirements
    );
  }

  private ensureDraft(): void {
    if (this.#status !== SpecificationStatus.Draft) {
      throw new Error("Requirements can only be modified while the specification is in Draft status.");
    }
  }
}