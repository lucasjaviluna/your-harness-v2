import { UseCase } from "../../../shared/index.js";

import {
    Specification,
    SpecificationId,
    SpecificationTitle
} from "@your-harness/domain";

import { SpecificationRepository } from "../../ports/index.js";

import {
    CreateSpecificationInput
} from "./create-specification.input.js";

import {
    CreateSpecificationOutput
} from "./create-specification.output.js";

export class CreateSpecificationUseCase
implements UseCase<
    CreateSpecificationInput,
    CreateSpecificationOutput
> {

    constructor(
        private readonly repository: SpecificationRepository
    ) {}

    async execute(
        input: CreateSpecificationInput
    ): Promise<CreateSpecificationOutput> {

        const specification = new Specification(
            new SpecificationId(input.id),
            new SpecificationTitle(input.title)
        );

        await this.repository.save(specification);

        return {
            id: specification.id.value
        };
    }

}
