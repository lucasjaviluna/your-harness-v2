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
| Execution environment contract | Implemented (runtime boundary enforcement) | `ExecutionEnvironmentGuard` enforces allowed workspace paths for every resolved runtime and exposes deny-by-default checks for capabilities, network, secrets and confirmations; only the guarded Pi `read` tool is enabled under explicit policy. |
| SDD provider and OpenSpec materialization | Implemented (scoped) | `SddProvider` reads neutral projections; `SddMaterializer` creates or replaces draft Changes through HITM, environment guard, atomic staging and digest verification. Existing replacements require the current base digest. Governed Change transitions and durable history are available; provider CLI/skill invocation and `openspec/specs/**` updates remain pending. |
| High-level Change CLI facade | Implemented (guarded apply slice) | `yh change inspect/status` expose SDD and HITM state and Apply history; `yh change propose/review` persist and display the complete handoff snapshot; `yh change approve` records immutable stage decisions; `yh change apply` requires full Apply Readiness, explicit confirmation and base-digest revalidation, and records a separate immutable audit plus transition history for every attempt; `yh change recover` classifies interrupted Apply and can persist an explicit HITM resolution with recovery audit, while repeated recovery keys replay the existing audit. Provider-specific crash diagnostics remain pending. |
| Change draft handoff | Implemented (contract, persistence and guarded apply) | `ChangeDraftHandoff` preserves the complete Proposal/Design/Tasks snapshot, provenance, base digest and proposed revision; each new handoff is immutable and must explicitly supersede the current one. `change apply` records a separate immutable `ChangeMaterializationAudit`; Apply transition history is persisted separately. |
| Operational execution trace | Implemented (local JSON) | `ExecutionTrace` links Change/task provenance, a Specification snapshot/digest, WorkItem and RuntimeResult outside Domain and Runtime; the CLI persists it after execution. Bindings also retain the approved Specification digest for drift detection. |
| Operational local persistence | Implemented | `createLocalOperationalStore` persists WorkItems, bindings, ExecutionTraces, Evidence, VerificationPlan/Report, CompletionAuthorizations, ChangeStageApprovals, ChangeApplyTransitionRecords, GovernedChangeRecords and ToolInvocationTraces under `.your-harness/state`; it does not copy provider-owned Specifications/OpenSpec artifacts. |
| Execution eligibility policy | Implemented | Requires an approved Specification, can require normalized Change provenance through `runtime.requireSddChangeTraceability`, and the CLI denies SDD snapshot drift before `RuntimePort`. |
| Project runtime configuration | Implemented (composition-level) | `.your-harness/config.yml` configures default runtime, SDD provider, materializer mode, SDD traceability and execution environment policy; external materialization requires an injected runner. |
| Verification and evidence | Implemented (scoped durable contracts + CLI) | ADR-009 contracts bind VerificationPlan to one ExecutionTrace and Specification digest; CLI records Evidence, creates/evaluates plans and persists reports. CompletionAuthorization gates `WorkItem.complete()` through role-based HITM decisions. |
| Pi workspace tools | Controlled read-only | Pi enables a guarded `read` tool only when `workspace.read` is explicitly configured; every path is checked, files over 256 KiB are rejected and invocations are auditable. Edit/write/process/network/secret tools remain disabled. |
| Operational audit queries | Implemented (execution trace + tool correlation) | `audit trace` shows an `ExecutionTrace` and independently persisted `ToolInvocationTrace` records correlated by `executionTraceId`; it does not promote tool traces to Evidence. |
| HITM execution scope | Implemented (initial hybrid contract) | `work select` persists a human-confirmed Requirement/Scenario scope and `work execute` validates its Specification digest before execution. |
| MCP transport | Stub | Client/server interfaces and JSON-RPC skeleton exist; real stdio/HTTP transport is pending. |
| Agent tools | Experimental / fail-closed | CLI ToolExecutor records an attempted call but returns `isError: true`; it never claims simulated success. |
| Workflow command/script steps | Explicitly unsupported | Steps fail with an explicit error until guarded process/script execution is implemented. |
| Configuration persistence | Partial | YAML is read; save path behavior requires consolidation. |
| Test suite | Early | Ninety-nine focused tests cover configuration, context projection, Core smoke flows, Runtime composition/boundary, execution environment, OpenSpec read-only projection, SDD drift, operational persistence/bindings, in-process and process-level CLI execution, Evidence/Verification/evaluator/HITM authorization, eligibility, guarded Pi tool integration and Apply recovery; broad coverage is pending. |

## Contrato de capabilities para v0.1.0

| Capability | Estado en v0.1.0 | Condición y guardrail |
| --- | --- | --- |
| `workspace.read` | Habilitable | Requiere `allowedPaths`; Pi sólo expone `read`, valida cada ruta y limita el tamaño a 256 KiB. |
| `workspace.write` | No habilitada por defecto | Requiere boundary `read-write`, capability explícita y confirmación HITM/risk class; sólo materialización gobernada consume escritura. |
| `process.execute` | No habilitada | Requiere capability, confirmación y adapter explícito; los workflow `command/script` todavía fallan cerrado. |
| `network.access` | No habilitada | Requiere allowlist de hosts y capability explícita; no hay tool estable que la consuma. |
| `secrets.read` | No habilitada | Requiere allowlist de nombres y capability explícita; secretos nunca se guardan en YAML. |
| `human.confirmation` | Requerida en operaciones de riesgo | `always` por defecto; no se infiere desde configuración para saltar HITM. |
| Agent tools generales | Experimental | ToolExecutor no simula éxito; llamadas no implementadas devuelven error. |
| MCP stdio/HTTP | Fuera de alcance | El cliente/servidor es skeleton; no debe seleccionarse como transporte operativo estable. |

## Superficie estable de v0.1.0

La superficie estable se limita a `version`, `config`, `mode`, `provider`, `change`, `work`, `evidence`, `verification` y `audit`, con sus contratos documentados de salida, guardrails y persistencia. Que una familia aparezca en `yh --help` no la convierte en parte de este contrato.

| Familia excluida | Estado y motivo |
| --- | --- |
| `plugin` | Gestión local sin contrato JSON/códigos de salida ni política de seguridad consolidada. |
| `skill` | Registro en proceso; no hay ciclo de invocación ni persistencia operacional estable. |
| `agent` | Requiere proveedor directo y sus tools fallan cerrado; no es una ruta de ejecución gobernada. |
| `workflow` | Las steps `command`/`script` no son soportadas y las tools no implementadas fallan cerrado. |
| `spec` | Parser/generador de prototipo sin contrato de materialización ni guardrails de salida. |
| `mcp` | Cliente/servidor JSON-RPC skeleton con respuestas mock; no existe transporte operativo real. |
