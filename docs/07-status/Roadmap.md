# Roadmap

## Next

1. Consolidate workspace installation hygiene and the public exports of Application.
2. Add a runtime registry plus project/execution-level runtime selection, removing direct Pi selection from the generic CLI flow.
3. Define a neutral execution-environment policy for workspace, tools, network, secrets and confirmations before enabling runtime tools.
4. Define the first physical `SddProvider` contract and implement a read-only provider spike.

## Later

5. Connect `yh work-item execute` to persistent WorkItem and Specification repositories.
6. Add operational traceability between Change, Specification, WorkItem and execution.
7. Add contextual requirement selection rather than projecting all requirements.
8. Introduce `ExecutionEligibilityPolicy` when a second concrete eligibility rule exists.
9. Define Verification/Evidence before interpreting runtime completion as engineering completion.
10. Implement real MCP transport and replace simulated tools and workflow steps with guarded implementations.

Roadmap items are directional, not commitments; accepted architectural changes belong in ADRs.
