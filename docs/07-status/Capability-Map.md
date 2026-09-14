# Capability Map

| Capability | Status | Notes |
| --- | --- | --- |
| CLI command structure | Implemented | Commander-based CLI with provider, plugin, skill, agent, MCP, workflow, spec, work-item and verification/evidence areas. |
| Domain Specification model | Implemented | Requirements and WHEN/THEN scenarios with lifecycle validation. |
| EngineeringContext | Implemented | Projection of approved Specifications. |
| Runtime boundary | Implemented | `ExecutionRequest`, `RuntimePort`, `RuntimeResult` and Pi adapter. |
| CLI work-item vertical | Implemented (operational) | Loads a persisted WorkItem/binding, projects current SDD material, applies Application eligibility, executes the selected runtime and stores a durable trace. |
| Application repository ports | Implemented | WorkItem/Specification ports plus generic in-memory repository. |
| TypeScript workspace build | Implemented | Composite projects and project references build Shared → Domain → Application → CLI/runtime. |
| Core-independent verification | Implemented | Smoke flow uses public package APIs and a `FakeRuntimePort`; Pi is tested separately. |
| First executable engineering slice | Implemented | Direct `ExecuteWorkItemUseCase` validation with `FakeRuntimeAdapter` and the real `PiRuntimeAdapter` test double. |
| Runtime composition and selection | Implemented (project-configured) | `RuntimeRegistry` resolves explicitly registered adapters; `runtime.defaultRuntime` comes from `.your-harness/config.yml` and Pi is registered lazily when the resolved selection is `pi`. |
| Execution environment contract | Implemented (runtime boundary enforcement) | `ExecutionEnvironmentGuard` enforces allowed workspace paths for every resolved runtime and exposes deny-by-default checks for capabilities, network, secrets and confirmations; tools still remain disabled. |
| SDD provider contract and OpenSpec spike | Implemented (read-only) | `SddProvider` exposes neutral specification/change projections; project config selects the current `openspec` adapter, which reads local artifacts without invoking a provider CLI or mutating files. |
| Operational execution trace | Implemented (local JSON) | `ExecutionTrace` links Change/task provenance, a Specification snapshot/digest, WorkItem and RuntimeResult outside Domain and Runtime; the CLI persists it after execution. Bindings also retain the approved Specification digest for drift detection. |
| Operational local persistence | Implemented | `createLocalOperationalStore` persists WorkItems, bindings, ExecutionTraces, Evidence and VerificationPlan/Report under `.your-harness/state`; it does not copy provider-owned Specifications/OpenSpec artifacts. |
| Execution eligibility policy | Implemented | Requires an approved Specification, can require normalized Change provenance through `runtime.requireSddChangeTraceability`, and the CLI denies SDD snapshot drift before `RuntimePort`. |
| Project runtime configuration | Implemented (composition-level) | `.your-harness/config.yml` configures default runtime, SDD provider, SDD traceability and execution environment policy; the CLI composes it for real operational execution. |
| Verification and evidence | Implemented (scoped durable contracts + CLI) | ADR-009 contracts bind VerificationPlan to one ExecutionTrace and Specification digest; CLI records Evidence, creates/evaluates plans and persists reports. CompletionAuthorization gates `WorkItem.complete()` through role-based HITM decisions. |
| Pi workspace tools | Controlled read-only | Pi enables built-in `read` only when `workspace.read` is explicitly configured; edit/write/process/network/secret tools remain disabled. |
| MCP transport | Stub | Client/server interfaces and JSON-RPC skeleton exist; real stdio/HTTP transport is pending. |
| Agent tools | Stub | CLI ToolExecutor currently reports simulated success. |
| Workflow command/script steps | Stub | Placeholder execution only. |
| Configuration persistence | Partial | YAML is read; save path behavior requires consolidation. |
| Test suite | Early | Forty-nine focused tests cover configuration, context projection, Core smoke flows, Runtime composition/boundary, execution environment, OpenSpec read-only projection, SDD drift, operational persistence/bindings, in-process and process-level CLI execution, Evidence/Verification/evaluator/HITM authorization, eligibility and guarded Pi tool integration; broad coverage is pending. |
