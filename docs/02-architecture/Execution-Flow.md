# Execution Flow

## Implemented flow

```mermaid
sequenceDiagram
  participant U as User
  participant C as yh CLI
  participant A as ExecuteWorkItemUseCase
  participant X as ContextAssembler
  participant P as PiRuntimeAdapter
  U->>C: work-item execute <objective>
  C->>A: WorkItem + approved demo Specification
  A->>X: assemble Specification
  X-->>A: EngineeringContext
  A->>P: ExecutionRequest
  P-->>A: RuntimeResult
  A-->>C: RuntimeResult
  C-->>U: status and summary
```

`ContextAssembler` only projects approved domain Specifications into execution-safe data. `ExecuteWorkItemUseCase` does not change the WorkItem state after a runtime result; completion remains an explicit engineering decision.

## Current limitation

The CLI creates an in-memory demonstration Specification and WorkItem. Repository-backed loading and contextual selection by identifiers are not implemented yet.
