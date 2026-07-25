import { UseCase } from "../../../shared/index.js";

import {
  Intent,
  IntentId,
  IntentTitle
} from "@your-harness/domain";

import { IntentRepository } from "../../ports/index.js";

import { CreateIntentInput } from "./create-intent.input.js";
import { CreateIntentOutput } from "./create-intent.output.js";

/**
 * Creates a new Intent.
 */
export class CreateIntentUseCase
  implements UseCase<CreateIntentInput, CreateIntentOutput>
{
  constructor(
    private readonly repository: IntentRepository
  ) {}

  async execute(
    input: CreateIntentInput
  ): Promise<CreateIntentOutput> {

    const intent = new Intent(
      new IntentId(input.id),
      new IntentTitle(input.title)
    );

    await this.repository.save(intent);

    return {
      id: intent.id.value
    };
  }
}
