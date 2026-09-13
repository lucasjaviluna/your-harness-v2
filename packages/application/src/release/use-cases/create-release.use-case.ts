import type { CreateReleaseInput } from "./create-release.input.js";
import { Release, ReleaseId, ReleaseVersion } from "@your-harness/domain";

import { UseCase } from "../../shared/index.js";

import type { ReleaseRepository } from "../ports/index.js";
import type { CreateReleaseOutput } from "./create-release.output.js";

export class CreateReleaseUseCase implements UseCase<
  CreateReleaseInput,
  CreateReleaseOutput
> {
  constructor(private readonly repository: ReleaseRepository) {}

  async execute(input: CreateReleaseInput): Promise<CreateReleaseOutput> {
    const release = new Release(
      new ReleaseId(input.id),
      new ReleaseVersion(input.version),
    );

    await this.repository.save(release);

    return {
      id: release.id.value,
    };
  }
}
