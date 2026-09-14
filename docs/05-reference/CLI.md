# CLI Reference

The executable name is `yh`.

| Area | Commands |
| --- | --- |
| General | `version`, `config`, `mode` |
| Providers | `provider list`, `provider use`, `provider test` |
| Extensions | `plugin`, `skill`, `agent` |
| Integration | `mcp`, `workflow`, `spec` |
| Execution | `work-item create <work-item-id>`, `work-item bind <work-item-id>`, `work-item select <work-item-id>`, `work-item start <work-item-id>`, `work-item execute <work-item-id>`, `work-item authorize <work-item-id>` (`work` alias) |
| Verification | `evidence record <evidence-id>`, `verification plan create <plan-id>`, `verification evaluate <plan-id>` |
| Audit | `audit trace <execution-trace-id>`, `audit work-item <work-item-id>` |

Run `yh <command> --help` for command-specific options. `audit trace` shows an `ExecutionTrace` together with independently persisted `ToolInvocationTrace` records correlated by `executionTraceId`; `audit work-item` lists all executions for a WorkItem. Both accept `--from` and `--to` as ISO-8601 timestamps and `--json` for machine-readable output. `work create` persists a WorkItem; `work bind` requires `--specification` and `--approve-specification`, with optional `--change` and repeated `--task`, before execution. `work execute` accepts `--workspace`, `--constraint` and `--runtime <fake|pi>`. `evidence record` anchors an observation to an existing trace; `verification plan create` accepts repeated criteria in `id:requirement|scenario:subject-id:evidence-kind` format; `verification evaluate` persists a report. `work start` applies the Domain transition to `InProgress`; `work authorize` requires `--report`, `--decision`, `--by`, `--role` and `--reason`. The HITM policy rejects unknown roles and decisions not allowed for that role; it is the only CLI path that can complete a WorkItem. If `--runtime` is omitted, the runtime comes from `runtime.defaultRuntime` (`fake` by default).
