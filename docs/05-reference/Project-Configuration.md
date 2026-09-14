# Project configuration

`your-harness` loads configuration in this precedence order:

1. Built-in safe defaults.
2. `~/.your-harness/config.yml`.
3. `<workspace>/.your-harness/config.yml`.
4. Provider secrets from environment variables.

The local file selects the behavior of the current project. It is YAML on write and read; it must not contain secrets, which remain environment variables.

## Runtime section

```yaml
runtime:
  # `fake` is the safe default. `pi` is enabled when selected here or by --runtime.
  defaultRuntime: fake

  # Only `openspec` exists today and is read-only.
  sddProvider: openspec

  # Adds Change provenance as an Application eligibility requirement.
  requireSddChangeTraceability: false

  executionEnvironment:
    workspace:
      # Paths are relative to the workspace passed to the execution command.
      allowedPaths: ["src", "packages"]
      mode: read-only
    capabilities: [workspace.read]
    network:
      mode: disabled
    secrets:
      mode: none
    confirmations:
      mode: always
```

`defaultRuntime` is used when `yh work execute` omits `--runtime`; the flag is a one-execution override. An unavailable configured runtime fails during composition instead of silently falling back.

`createProjectRuntimeEnvironment` translates this section into three distinct contracts:

```text
config.yml
   ├── RuntimeEnvironment / RuntimeRegistry
   ├── SddProvider
   └── ExecutionEligibilityPolicy + ExecutionEnvironment
```

The configured SDD provider is composed but the current demonstration CLI does not read OpenSpec to construct aggregates yet. Similarly, `ExecutionEnvironment` validates policy consistency but Pi tools remain disabled. Configuration therefore cannot grant filesystem, process, network, or secret access today.

## Environment policy validation

The policy is deny-by-default. To enable a capability, its corresponding boundary must also be explicit:

- `workspace.write` requires `workspace.mode: read-write`.
- `network.access` requires `network.mode: allowlist` and at least one host.
- `secrets.read` requires `secrets.mode: allowlist` and at least one secret name.
- Every `allowedPaths` entry must remain inside the execution workspace.

These checks fail before runtime execution. The runtime boundary now enforces the
workspace boundary for every resolved `RuntimePort` and exposes guard methods for
capabilities, network, secrets and confirmations. Tool adapters must use those guard
methods before they are enabled.
