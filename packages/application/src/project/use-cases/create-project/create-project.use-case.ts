import { UseCase } from "../../../shared/index.js";

import {
  Project,
  ProjectId,
  ProjectName
} from "@your-harness/domain";

import { ProjectRepository } from "../../ports/index.js";

import {
  CreateProjectInput
} from "./create-project.input.js";

import {
  CreateProjectOutput
} from "./create-project.output.js";

/**
 * Creates a new Project.
 */
export class CreateProjectUseCase
  implements
    UseCase<
      CreateProjectInput,
      CreateProjectOutput
    >
{
  constructor(
    private readonly repository: ProjectRepository
  ) {}

  async execute(
    input: CreateProjectInput
  ): Promise<CreateProjectOutput> {

    const project = new Project(
      new ProjectId(input.id),
      new ProjectName(input.name)
    );

    await this.repository.save(project);

    return {
      id: project.id.value
    };
  }
}
