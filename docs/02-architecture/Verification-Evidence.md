# Verification and Evidence

The proposed post-execution flow separates four things that must not be conflated:

```text
RuntimeResult → execution observation
Evidence      → inspectable claim from an execution or review
Verification  → evaluation against approved Requirements/Scenarios
Authorization → explicit decision to complete or request rework
```

`RuntimeResult.status = completed` therefore means only that the runtime completed
its requested work. It produces `pending-verification`, not WorkItem completion.

`ExecutionTrace` is the bridge from an execution to evidence. Its Specification
snapshot includes the neutral provenance and digest used for that execution.
`Evidence` is now an
immutable Application contract with a trace identifier, subject reference, kind,
outcome, locator/digest, summary and capture time. `RecordEvidenceUseCase` verifies
that its `ExecutionTrace` exists through the repository port before it accepts the
record; this permits a local durable trace store to anchor evidence across processes.

`VerificationPlan` selects Requirement/Scenario criteria and expected evidence kinds,
and is bound to one `ExecutionTrace` plus its Specification snapshot digest.
`VerificationReport` and their repositories are now durable local contracts under
`.your-harness/state`. They do not authorize completion or transition a WorkItem. The design remains specified in [ADR-009](../adr/ADR-009.md).

Application now includes a conservative deterministic evaluator. It first requires the
supplied trace ID and Specification ID/digest to match the plan, then ignores Evidence
from every other execution. For each criterion:

- failed matching evidence produces `failed`;
- missing expected evidence kinds produce `inconclusive`;
- inconclusive matching evidence produces `inconclusive`;
- passed `review-note` or `attestation` evidence produces `requires-human-review`;
- otherwise the criterion is `verified`.

Report-level precedence is `failed`, then `requires-human-review`, then
`inconclusive`, then `verified`. This evaluator creates a report only; it does not
authorize completion.

`CompletionAuthorization` is the separate final decision. `CompleteWorkItemUseCase`
validates report/trace/WorkItem linkage, accepts `verified` or explicit
`requires-human-review` outcomes, and is the only path that calls `WorkItem.complete()`.
`request-rework` and `require-further-review` are persisted decisions that leave the
WorkItem unchanged.
