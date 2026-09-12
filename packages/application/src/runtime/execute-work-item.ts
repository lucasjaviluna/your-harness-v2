import type { Specification } from "../../../domain/src/specification/index.js";
import type { WorkItem } from "../../../domain/src/work-item/index.js";
import type { ContextAssembler } from "../context/context-assembler.js";
import { createContextAssembler } from "../context/context-assembler.js";
import type { EngineeringKnowledge } from "../context/engineering-knowledge.js";
import type { UseCase } from "../shared/use-cases/use-case.js";

import type { ExecutionRequest } from "./execution-request.js";
import type { RuntimePort } from "./runtime-port.js";
import type { RuntimeResult } from "./runtime-result.js";

export interface ExecuteWorkItemInput {
  readonly workItem: WorkItem;
  readonly specification: Specification;
  readonly workspace: string;
  readonly knowledge?: ReadonlyArray<EngineeringKnowledge>;
  readonly engineeringConstraints?: ReadonlyArray<string>;
  readonly executionConstraints?: ReadonlyArray<string>;
}

/**
 * Contextualiza un WorkItem y delega su ejecución en el runtime configurado.
 * Este caso de uso no modifica el estado del WorkItem automáticamente.
 */
export class ExecuteWorkItemUseCase
  implements UseCase<ExecuteWorkItemInput, RuntimeResult>
{
  constructor(
    private readonly runtime: RuntimePort,
    private readonly contextAssembler: ContextAssembler = createContextAssembler()
  ) {}

  async execute(input: ExecuteWorkItemInput): Promise<RuntimeResult> {
    const request: ExecutionRequest = {
      objective: input.workItem.title.value,
      workspace: input.workspace,
      engineeringContext: this.contextAssembler.assemble({
        specification: input.specification,
        knowledge: input.knowledge,
        engineeringConstraints: input.engineeringConstraints,
      }),
      executionConstraints: [...(input.executionConstraints ?? [])],
    };

    return this.runtime.execute(request);
  }
}
