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
| Changes | `change inspect`, `change status`, `change propose`, `change review`, `change approve`, `change apply`, `change recover` |

Run `yh <command> --help` for command-specific options. `audit trace` shows an `ExecutionTrace` together with independently persisted `ToolInvocationTrace` records correlated by `executionTraceId`; `audit work-item` lists all executions for a WorkItem. Both accept `--from` and `--to` as ISO-8601 timestamps and `--json` for machine-readable output. `work create` persists a WorkItem; `work bind` requires `--specification` and `--approve-specification`, with optional `--change` and repeated `--task`, before execution. `work execute` accepts `--workspace`, `--constraint` and `--runtime <fake|pi>`. `evidence record` anchors an observation to an existing trace; `verification plan create` accepts repeated criteria in `id:requirement|scenario:subject-id:evidence-kind` format; `verification evaluate` persists a report. `work start` applies the Domain transition to `InProgress`; `work authorize` requires `--report`, `--decision`, `--by`, `--role` and `--reason`. The HITM policy rejects unknown roles and decisions not allowed for that role; it is the only CLI path that can complete a WorkItem. If `--runtime` is omitted, the runtime comes from `runtime.defaultRuntime` (`fake` by default).

## Contrato de salida y errores

Los comandos soportados de `version`, `config`, `mode`, `provider`, `change`, `work`, `audit` y `verification` aceptan `--json`. En éxito, el payload de datos conserva la forma propia del comando para no romper consumidores existentes. En error con `--json`, la salida es un único objeto estable y parseable:

```json
{
  "ok": false,
  "error": {
    "code": "CHANGE_APPLY_FAILED",
    "message": "..."
  }
}
```

Los errores de comandos finalizan con exit code `1`; el código textual `error.code` permite distinguir la operación fallida sin analizar el texto humano. La salida humana continúa usando mensajes legibles. La CLI no mezcla logs de diagnóstico con stdout JSON; los consumidores deben tratar stdout como contrato de datos cuando usan `--json`.

La taxonomía reservada de exit codes es: `0` éxito, `1` error inesperado, `2` uso o validación, `3` guardrail/HITM, `4` recurso inexistente, `5` conflicto o estado obsoleto y `6` proveedor/runtime externo. La adopción es progresiva: los comandos aún no clasificados usan `1`; los errores JSON ya incluyen el `exitCode` efectivo.
