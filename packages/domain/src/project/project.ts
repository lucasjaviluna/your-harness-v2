import { AggregateRoot } from "@your-harness/shared";
import { ProjectId } from "./project-id.js";
import { ProjectName } from "./project-name.js";

/**
 * Represents an engineering project managed by Your Harness.
 *
 * A Project is the root aggregate of the engineering domain.
 */
export class Project extends AggregateRoot<ProjectId> {
  readonly #name: ProjectName;

  constructor(
    id: ProjectId,
    name: ProjectName
  ) {
    super(id);

    this.#name = name;
  }

  get name(): ProjectName {
    return this.#name;
  }

  rename(name: ProjectName): Project {
    return new Project(this.id, name);
  }
}
