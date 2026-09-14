# Pi Runtime

`PiRuntimeAdapter` implements `RuntimePort`. It turns an `ExecutionRequest` into a structured prompt containing objective, knowledge, requirements with scenarios, engineering constraints and execution constraints.

The `RuntimeEnvironment` composition root owns a `RuntimeRegistry`, an `ExecutionEnvironment` contract and an enforcement guard. `createProjectRuntimeEnvironment` supplies them from `.your-harness/config.yml`: `fake` is the built-in default, while `runtime.defaultRuntime` applies when the CLI omits `--runtime`. Pi is registered lazily only when the resolved runtime is `pi`. The environment contract models the allowed workspace, capabilities, network, secrets and confirmations with deny-by-default values; every resolved runtime is rejected when its request escapes the allowed workspace.

## Safety status

By default the adapter creates Pi sessions with `noTools: "all"`. When the project
explicitly grants `workspace.read`, it enables only Pi's built-in `read` tool. Edit,
write, process, network and secret tools remain disabled.

Future tool enablement must consume the guard for capability, network, secret and
confirmation checks, and add adapter-specific enforcement tests before expanding
beyond the current guarded read-only tool.

## Verification

`tests/pi-runtime-integration.test.ts` replaces the Pi session with a test double and verifies prompt projection, result handling and session disposal without network calls.
