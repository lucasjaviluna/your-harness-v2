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
| Runtime composition and selection | Implemented (composition-level) | `RuntimeRegistry` resolves explicitly registered adapters; `fake` is the default and Pi is registered lazily when selected. Project-level configuration and persistence are pending. |
| Execution environment contract | Implemented (policy model) | `ExecutionEnvironment` validates workspace boundaries, capabilities, network, secrets and confirmations with safe defaults; runtime tool enforcement is still disabled. |
| SDD provider contract and OpenSpec spike | Implemented (read-only) | `SddProvider` exposes neutral specification/change projections; `OpenSpecSddProvider` reads local artifacts without invoking a provider CLI or mutating files. |
| Operational execution trace | Implemented (in-memory) | `ExecutionTrace` links Change/task provenance, Specification, WorkItem and RuntimeResult outside Domain and Runtime; durable repository storage is pending. |
| Execution eligibility policy | Implemented | Requires an approved Specification and can require normalized Change provenance when SDD traceability is configured; denies before `RuntimePort`. |
| Pi workspace tools | Disabled | `noTools: "all"`. |
| MCP transport | Stub | Client/server interfaces and JSON-RPC skeleton exist; real stdio/HTTP transport is pending. |
| Agent tools | Stub | CLI ToolExecutor currently reports simulated success. |
| Workflow command/script steps | Stub | Placeholder execution only. |
| Configuration persistence | Partial | YAML is read; save path behavior requires consolidation. |
| Test suite | Early | Twenty-two focused tests cover context projection, Core smoke flows, Runtime composition/boundary, execution environment, OpenSpec read-only projection, operational traceability, execution eligibility and Pi adapter; broad coverage is pending. |
