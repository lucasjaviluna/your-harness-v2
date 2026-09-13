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

`ExecutionTrace` is the bridge from an execution to evidence. Future evidence records
will retain their trace identifier, subject reference, kind, outcome, locator/digest
and capture time. A verification report will then aggregate evidence for a selected
set of approved Requirements and Scenarios.

The design is specified in [ADR-009](../adr/ADR-009.md). No Evidence, Verification
or completion-authorization implementation exists yet.
