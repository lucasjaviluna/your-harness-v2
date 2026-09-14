# Roadmap

## Next

1. ~~Consolidate workspace installation hygiene and the public exports of Application.~~ **Completed:** npm lockfile/clean-install path is aligned, `rimraf` resolves without invalid workspace entries, and Application exposes its current public modules.
2. ~~Extend `RuntimeEnvironment` with project/execution-level configuration.~~ **Completed:** `.your-harness/config.yml` resolves runtime, SDD provider, eligibility and environment-policy composition. Runtime capability reporting remains pending.
3. ~~Define a neutral execution-environment policy for workspace, tools, network, secrets and confirmations before enabling runtime tools.~~ **Completed at the runtime boundary:** resolved runtimes reject workspace escape and the guard exposes capability/network/secret/confirmation checks; tool adapters remain pending.
4. ~~Define the first physical `SddProvider` contract and implement a read-only provider spike.~~ **Completed:** the neutral port and the local read-only OpenSpec adapter are implemented and selected through project configuration; write workflows remain pending.

Local operational persistence is now wired into the CLI: `work create` and `work bind` create durable state, `work execute` resolves current provider-owned SDD material and persists a trace, and the Evidence/VerificationPlan/VerificationReport cycle is available through CLI commands. `audit trace` now inspects an execution together with independently persisted tool invocations correlated by `executionTraceId`.

## Later

5. ~~Connect `yh work-item execute` to persistent operational state and an authoritative Specification source.~~ **Completed:** the CLI reads persistent WorkItems/bindings, projects the configured read-only SDD source, and writes traces. It intentionally does not mirror Specifications locally.
6. ~~Add operational traceability between Change, Specification, WorkItem and execution.~~ **Completed:** `ExecutionTrace` records the linkage without changing Domain relationships and is persisted locally by the CLI.
7. Add contextual requirement selection rather than projecting all requirements.
8. ~~Introduce `ExecutionEligibilityPolicy` when a second concrete eligibility rule exists.~~ **Completed:** approved Specification is explicit and optional SDD Change traceability can be required before runtime execution.
9. ~~Define Verification/Evidence before interpreting runtime completion as engineering completion.~~ **Scoped contracts, local durability, deterministic evaluation and explicit authorization implemented:** ADR-009 binds plans to one trace and Specification digest, filters Evidence to that execution, produces conservative reports and gates `WorkItem.complete()` through `CompletionAuthorization` and `work authorize`.
10. Implement real MCP transport and replace simulated tools and workflow steps with guarded implementations.
11. ~~Add SDD snapshot/digest drift detection before execution and require rebind or reauthorization when the approved projection changes.~~ **Completed:** `work bind` stores the approved digest and `work execute` denies changed or legacy bindings before invoking the runtime.
12. ~~Add a minimum HITM policy for CompletionAuthorization.~~ **Completed:** actor identity and role are explicit, roles have allowed decisions, and the immutable authorization record preserves the audit fields.
13. ~~Enable one Pi tool under `ExecutionEnvironmentGuard`.~~ **Completed narrowly:** Pi exposes a guarded `read` tool when `workspace.read` is explicitly configured, validates every path, limits files to 256 KiB and persists invocation traces; broader tools remain gated.
14. ~~Expose operational audit queries for executions and tool invocations.~~ **Completed:** `audit trace` correlates `ToolInvocationTrace` records with an `ExecutionTrace` without promoting them to Evidence.
15. ~~Add WorkItem and temporal filters to operational audit queries.~~ **Completed:** `audit work-item` filters executions by WorkItem and both audit queries support inclusive ISO-8601 `--from`/`--to` ranges.

Roadmap items are directional, not commitments; accepted architectural changes belong in ADRs.
