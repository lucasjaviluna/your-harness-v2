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

`VerificationPlan` selects Requirement/Scenario criteria and expected evidence kinds.
`VerificationReport` and their repositories are now durable local contracts under
`.your-harness/state`. They do not yet evaluate evidence automatically, authorize
completion, or transition a WorkItem. The design remains specified in [ADR-009](../adr/ADR-009.md).
