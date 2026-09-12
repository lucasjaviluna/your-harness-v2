# Pi Runtime

`PiRuntimeAdapter` implements `RuntimePort`. It turns an `ExecutionRequest` into a structured prompt containing objective, knowledge, requirements with scenarios, engineering constraints and execution constraints.

## Safety status

The adapter currently creates Pi sessions with `noTools: "all"`. It can reason over the supplied context but is not yet authorized to read, edit, or execute commands in a workspace.

Future tool enablement must introduce an explicit workspace boundary, allow-list policy, confirmation model and tests before changing this default.

## Verification

`tests/pi-runtime-integration.test.ts` replaces the Pi session with a test double and verifies prompt projection, result handling and session disposal without network calls.
