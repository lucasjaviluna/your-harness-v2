# CLI Reference

The executable name is `yh`.

| Area | Commands |
| --- | --- |
| General | `version`, `config`, `mode` |
| Providers | `provider list`, `provider use`, `provider test` |
| Extensions | `plugin`, `skill`, `agent` |
| Integration | `mcp`, `workflow`, `spec` |
| Execution | `work-item create <work-item-id>`, `work-item bind <work-item-id>`, `work-item start <work-item-id>`, `work-item execute <work-item-id>`, `work-item authorize <work-item-id>` (`work` alias) |

Run `yh <command> --help` for command-specific options. `work create` persists a WorkItem; `work bind` requires `--specification` and `--approve-specification`, with optional `--change` and repeated `--task`, before execution. `work execute` accepts `--workspace`, `--constraint` and `--runtime <fake|pi>`. `work start` applies the Domain transition to `InProgress`; `work authorize` requires `--report`, `--decision`, `--by` and `--reason`, and is the only CLI path that can complete a WorkItem. If `--runtime` is omitted, the runtime comes from `runtime.defaultRuntime` (`fake` by default).
