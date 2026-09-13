# Pi Runtime

`PiRuntimeAdapter` implements `RuntimePort`. It turns an `ExecutionRequest` into a structured prompt containing objective, knowledge, requirements with scenarios, engineering constraints and execution constraints.

The `RuntimeEnvironment` composition root owns a `RuntimeRegistry` and an `ExecutionEnvironment` contract. `fake` is the default when the CLI omits `--runtime`; `PiRuntimeAdapter` is registered lazily only for `--runtime pi`. The environment contract now models the allowed workspace, capabilities, network, secrets and confirmations with deny-by-default values.

## Safety status

The adapter currently creates Pi sessions with `noTools: "all"`. It can reason over the supplied context but is not yet authorized to read, edit, or execute commands in a workspace.

Future tool enablement must consume this contract and add adapter-specific enforcement tests before changing the current `noTools: "all"` default.

## Verification

`tests/pi-runtime-integration.test.ts` replaces the Pi session with a test double and verifies prompt projection, result handling and session disposal without network calls.
