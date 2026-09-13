# Roadmap

## Next

1. ~~Consolidate workspace installation hygiene and the public exports of Application.~~ **Completed:** npm lockfile/clean-install path is aligned, `rimraf` resolves without invalid workspace entries, and Application exposes its current public modules.
2. Extend `RuntimeEnvironment` with project/execution-level configuration and runtime capability reporting.
3. ~~Define a neutral execution-environment policy for workspace, tools, network, secrets and confirmations before enabling runtime tools.~~ **Completed as a contract:** enforcement and tool adapters remain pending.
4. ~~Define the first physical `SddProvider` contract and implement a read-only provider spike.~~ **Completed:** the neutral port and the local read-only OpenSpec adapter are implemented; provider selection and write workflows remain pending.

## Later

5. Connect `yh work-item execute` to persistent WorkItem and Specification repositories.
6. ~~Add operational traceability between Change, Specification, WorkItem and execution.~~ **Completed in-memory:** `ExecutionTrace` records the linkage without changing Domain relationships; durable local persistence remains pending.
7. Add contextual requirement selection rather than projecting all requirements.
8. ~~Introduce `ExecutionEligibilityPolicy` when a second concrete eligibility rule exists.~~ **Completed:** approved Specification is explicit and optional SDD Change traceability can be required before runtime execution.
9. ~~Define Verification/Evidence before interpreting runtime completion as engineering completion.~~ **Designed:** ADR-009 defines the model; Application contracts, repositories and completion authorization remain pending.
10. Implement real MCP transport and replace simulated tools and workflow steps with guarded implementations.

Roadmap items are directional, not commitments; accepted architectural changes belong in ADRs.
