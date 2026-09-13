# Capability Map

| Capability | Status | Notes |
| --- | --- | --- |
| CLI command structure | Implemented | Commander-based CLI with provider, plugin, skill, agent, MCP, workflow, spec and work-item areas. |
| Domain Specification model | Implemented | Requirements and WHEN/THEN scenarios with lifecycle validation. |
| EngineeringContext | Implemented | Projection of approved Specifications. |
| Runtime boundary | Implemented | `ExecutionRequest`, `RuntimePort`, `RuntimeResult` and Pi adapter. |
| CLI work-item vertical | Implemented | Uses temporary demonstration data; no persistence. |
| Application repository ports | Implemented | WorkItem/Specification ports plus generic in-memory repository. |
| TypeScript workspace build | Implemented | Composite projects and project references build Shared → Domain → Application → CLI/runtime. |
| Core-independent verification | Implemented | Smoke flow uses public package APIs and a `FakeRuntimePort`; Pi is tested separately. |
| First executable engineering slice | Implemented | Direct `ExecuteWorkItemUseCase` validation with `FakeRuntimeAdapter` and the real `PiRuntimeAdapter` test double. |
| Runtime composition and selection | Implemented (project-configured) | `RuntimeRegistry` resolves explicitly registered adapters; `runtime.defaultRuntime` comes from `.your-harness/config.yml` and Pi is registered lazily when the resolved selection is `pi`. |
| Execution environment contract | Implemented (policy model) | `ExecutionEnvironment` validates workspace boundaries, capabilities, network, secrets and confirmations with safe defaults; runtime tool enforcement is still disabled. |
| SDD provider contract and OpenSpec spike | Implemented (read-only) | `SddProvider` exposes neutral specification/change projections; project config selects the current `openspec` adapter, which reads local artifacts without invoking a provider CLI or mutating files. |
| Operational execution trace | Implemented (local JSON) | `ExecutionTrace` links Change/task provenance, Specification, WorkItem and RuntimeResult outside Domain and Runtime; CLI composition and indexes are pending. |
| Operational local persistence | Implemented (foundation) | `createLocalOperationalStore` persists WorkItems and ExecutionTraces under `.your-harness/state`; it intentionally does not copy Specifications/OpenSpec artifacts. |
| Execution eligibility policy | Implemented | Requires an approved Specification and can require normalized Change provenance through `runtime.requireSddChangeTraceability`; denies before `RuntimePort`. |
| Project runtime configuration | Implemented (composition-level) | `.your-harness/config.yml` configures default runtime, SDD provider, SDD traceability and execution environment policy; the demo CLI does not yet compose persistent repositories or SDD artifacts. |
| Verification and evidence | Designed (not implemented) | ADR-009 defines evidence, verification reports and explicit completion authorization; RuntimeResult remains an observation. |
| Pi workspace tools | Disabled | `noTools: "all"`. |
| MCP transport | Stub | Client/server interfaces and JSON-RPC skeleton exist; real stdio/HTTP transport is pending. |
| Agent tools | Stub | CLI ToolExecutor currently reports simulated success. |
| Workflow command/script steps | Stub | Placeholder execution only. |
| Configuration persistence | Partial | YAML is read; save path behavior requires consolidation. |
| Test suite | Early | Twenty-five focused tests cover context projection, Core smoke flows, Runtime composition/boundary, execution environment, OpenSpec read-only projection, operational traceability, local persistence, execution eligibility and Pi adapter; broad coverage is pending. |
