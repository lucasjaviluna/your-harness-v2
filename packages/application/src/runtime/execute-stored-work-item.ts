import type { SpecificationId, WorkItemId } from "@your-harness/domain";
import type { ContextAssembler } from "../context/context-assembler.js";
import { createContextAssembler } from "../context/context-assembler.js";
import type { WorkItemRepository } from "../work-item/ports/index.js";
import type { SpecificationRepository } from "../specification/ports/specification-repository.js";

import { ExecuteWorkItemUseCase } from "./execute-work-item.js";
import type { RuntimePort } from "./runtime-port.js";
import type { RuntimeResult } from "./runtime-result.js";
import type { ExecutionTraceRepository } from "../trace/execution-trace-repository.js";
import type { SddChangeReference } from "../trace/execution-trace.js";
import type { SddProvenance } from "../sdd/sdd-provider.js";

export interface ExecuteStoredWorkItemInput {
  readonly workItemId: WorkItemId;
  readonly specificationId: SpecificationId;
  readonly workspace: string;
  readonly executionConstraints?: ReadonlyArray<string>;
  readonly trace?: {
    readonly id: string;
    readonly runtimeId: string;
    readonly change?: SddChangeReference;
    readonly taskReferences?: ReadonlyArray<SddProvenance>;
  };
}

/** Carga los agregados por ID y ejecuta el WorkItem contextualizado. */
export class ExecuteStoredWorkItemUseCase {
  readonly #executeWorkItem: ExecuteWorkItemUseCase;

  constructor(
    private readonly workItems: WorkItemRepository,
    private readonly specifications: SpecificationRepository,
    runtime: RuntimePort,
    contextAssembler: ContextAssembler = createContextAssembler(),
    private readonly traces?: ExecutionTraceRepository,
  ) {
    this.#executeWorkItem = new ExecuteWorkItemUseCase(runtime, contextAssembler);
  }

  async execute(input: ExecuteStoredWorkItemInput): Promise<RuntimeResult> {
    const workItem = await this.workItems.findById(input.workItemId);
    if (!workItem) throw new Error(`Work item '${input.workItemId.value}' not found.`);

    const specification = await this.specifications.findById(input.specificationId);
    if (!specification) throw new Error(`Specification '${input.specificationId.value}' not found.`);

    const result = await this.#executeWorkItem.execute({
      workItem,
      specification,
      workspace: input.workspace,
      executionConstraints: input.executionConstraints,
    });

    if (input.trace) {
      if (!this.traces) {
        throw new Error("Execution trace requested but no trace repository is configured.");
      }
      await this.traces.save({
        id: input.trace.id,
        workItemId: workItem.id.value,
        specificationId: specification.id.value,
        change: input.trace.change,
        taskReferences: [...(input.trace.taskReferences ?? [])],
        runtimeId: input.trace.runtimeId,
        runtimeResult: result,
        recordedAt: new Date().toISOString(),
      });
    }

    return result;
  }
}
