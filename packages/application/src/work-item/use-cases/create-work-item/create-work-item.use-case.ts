import {
  IntentId,
  WorkItem,
  WorkItemId,
  WorkItemTitle,
} from "@your-harness/domain";

import { UseCase } from "../../../shared/index.js";
import { WorkItemRepository } from "../../ports/index.js";

import { CreateWorkItemInput } from "./create-work-item.input.js";
import { CreateWorkItemOutput } from "./create-work-item.output.js";

/**
 * Creates a new Work Item.
 */
export class CreateWorkItemUseCase implements UseCase<
  CreateWorkItemInput,
  CreateWorkItemOutput
> {
  constructor(private readonly repository: WorkItemRepository) {}

  async execute(input: CreateWorkItemInput): Promise<CreateWorkItemOutput> {
    const workItem = new WorkItem(
      new WorkItemId(input.id),
      new IntentId(input.intentId),
      new WorkItemTitle(input.title),
    );

    await this.repository.save(workItem);

    return {
      id: workItem.id.value,
    };
  }
}
