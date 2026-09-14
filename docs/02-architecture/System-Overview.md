# System Overview

`your-harness` is a CLI-first engineering harness for AI-assisted software work. It separates engineering intent and domain knowledge from the concrete runtime that performs an execution.

## Repository topology

```mermaid
flowchart LR
  CLI["src/cli\nyh commands"] --> APP["packages/application\nuse cases and contracts"]
  APP --> DOMAIN["packages/domain\nengineering model"]
  RUNTIME["src/runtime\nPi adapter"] -->|implements RuntimePort| APP
  SDD["src/sdd\nOpenSpec read-only adapter"] -->|implements SddProvider| APP
  CLI --> RUNTIME
  CLI --> CORE["src/core\nconfiguration, AI, MCP"]
  CORE --> CONNECTORS["src/connectors\nAI providers"]
```

`src/` is the executable harness: CLI composition, provider connectors, MCP skeletons, agents, plugins, skills and workflows. `packages/` is the engineering model: shared primitives, domain aggregates and application use cases. The CLI composition starts at `src/cli/create-program.ts`; independent registration modules under `src/cli/commands/` receive explicit context, while shared command dependencies live under `src/cli/composition/`. `CliContext` supplies configuration, logging and replaceable CLI IO, allowing command behavior to be exercised in-process. The binary entrypoint is intentionally limited to program creation and argument parsing.

`src/persistence/local/` provides JSON repositories for YH-owned operational state (`WorkItem` and `ExecutionTrace`) beneath `.your-harness/state/`. It does not mirror provider-owned SDD artifacts.

Application `verification/` provides immutable Evidence and VerificationPlan/Report contracts. Evidence registration references an existing ExecutionTrace; local repositories persist Evidence, plans and reports, and the deterministic evaluator produces conservative outcomes scoped to the trace and Specification snapshot. `CompletionAuthorization` is the explicit gate before a WorkItem can be completed.

Each package is an independent composite TypeScript project. The root `tsconfig.json` references Shared, Domain and Application and includes only `src/**`. Cross-project consumers use `@your-harness/domain` and `@your-harness/application`; they do not import package source paths.

## Current vertical slice

The implemented execution path is `WorkItem + approved Specification → ContextAssembler → EngineeringContext → ExecutionRequest → RuntimePort → RuntimeResult`. It is verified independently with a `FakeRuntimePort`; the CLI resolves the selected adapter through `RuntimeRegistry`, uses `fake` by default, and the persistent `work` flow resolves the configured SDD source before writing an `ExecutionTrace`.

The first SDD integration is independent from this execution path: `OpenSpecSddProvider` reads current specification material and proposed change descriptors through the Application `SddProvider` port. It does not mutate OpenSpec files or pass provider artifacts to the Runtime.

## Source documents

- [ADR-002](../adr/ADR-002.md): Engineering Core and Agent Runtime boundary.
- [ADR-003](../adr/ADR-003.md): Specification model.
- [ADR-004](../adr/ADR-004.md): runtime boundary.
- [ADR-005](../adr/ADR-005.md): Engineering Context.
- [ADR-006](../adr/ADR-006.md): SDD change boundary and provider contract.
- [ADR-007](../adr/ADR-007.md): layered engineering guardrails.
- [ADR-008](../adr/ADR-008.md): user-selectable SDD providers and runtimes.
- [ADR-009](../adr/ADR-009.md): verification, evidence and post-execution interpretation.
- [ADR-010](../adr/ADR-010.md): neutral SDD lifecycle proposal.
- [ADR-011](../adr/ADR-011.md): SDD provider write and synchronization boundary.
