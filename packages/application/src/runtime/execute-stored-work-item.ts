import type { SpecificationId } from "../../../domain/src/specification/index.js";
import type { WorkItemId } from "../../../domain/src/work-item/index.js";
import type { ContextAssembler } from "../context/context-assembler.js";
import { createContextAssembler } from "../context/context-assembler.js";
import type { WorkItemRepository } from "../work-item/ports/index.js";
import type { SpecificationRepository } from "../specification/ports/specification-repository.js";

import { ExecuteWorkItemUseCase } from "./execute-work-item.js";
import type { RuntimePort } from "./runtime-port.js";
import type { RuntimeResult } from "./runtime-result.js";

export interface ExecuteStoredWorkItemInput {
  readonly workItemId: WorkItemId;
  readonly specificationId: SpecificationId;
  readonly workspace: string;
  readonly executionConstraints?: ReadonlyArray<string>;
}

/** Carga los agregados por ID y ejecuta el WorkItem contextualizado. */
export class ExecuteStoredWorkItemUseCase {
  readonly #executeWorkItem: ExecuteWorkItemUseCase;

  constructor(
    private readonly workItems: WorkItemRepository,
    private readonly specifications: SpecificationRepository,
    runtime: RuntimePort,
    contextAssembler: ContextAssembler = createContextAssembler(),
  ) {
    this.#executeWorkItem = new ExecuteWorkItemUseCase(runtime, contextAssembler);
  }

  async execute(input: ExecuteStoredWorkItemInput): Promise<RuntimeResult> {
    const workItem = await this.workItems.findById(input.workItemId);
    if (!workItem) throw new Error(`Work item '${input.workItemId.value}' not found.`);

    const specification = await this.specifications.findById(input.specificationId);
    if (!specification) throw new Error(`Specification '${input.specificationId.value}' not found.`);

    return this.#executeWorkItem.execute({
      workItem,
      specification,
      workspace: input.workspace,
      executionConstraints: input.executionConstraints,
    });
  }
}
