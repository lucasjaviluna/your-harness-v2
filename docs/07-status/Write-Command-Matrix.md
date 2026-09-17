# Matriz de comandos con efectos persistentes

Esta matriz delimita la superficie de escritura que puede incluir `v0.1.0`. La persistencia operacional local y la materialización del workspace son efectos distintos.

| Comando | Efecto persistente | ¿Escribe OpenSpec? | Control requerido | Cobertura actual |
|---|---|---:|---|---|
| `yh change propose` | Crea un `ChangeDraftHandoff` inmutable en `.your-harness/state` | No | Snapshot y digest del provider | `tests/cli/create-program.test.ts`, `tests/cli/change-process-e2e.test.ts` |
| `yh change approve` | Crea una `ChangeStageApproval` inmutable | No | Actor, rol, razón, etapa y digest | `tests/cli/create-program.test.ts`, `tests/cli/change-process-e2e.test.ts` |
| `yh change apply` | Crea auditoría/transiciones y materializa los tres documentos del Change | Sí | Capability, containment, `--confirm`, HITM y digest base | `tests/cli/create-program.test.ts`, `tests/sdd/openspec-materializer.test.ts`, `tests/cli/change-process-e2e.test.ts` |
| `yh change recover` | Crea resolución, auditoría y transición | No directamente | Evidencia actual, decisión HITM, confirmación e idempotency key | `tests/cli/create-program.test.ts`, `tests/cli/change-process-e2e.test.ts` |
| `yh work create` / `work-item create` | Persiste un `WorkItem` | No | Identificador seguro y store local | `tests/cli/work-item-command.test.ts` |
| `yh work bind` / `work select` | Persiste binding SDD y alcance HITM | No | Provenance, digest y aprobación explícita | `tests/cli/persistent-work-item-execution.test.ts` |
| `yh work execute` | Persiste `ExecutionTrace` | No | Elegibilidad, provenance y environment guard | `tests/cli/persistent-work-item-execution.test.ts` (éxito y scope HITM ausente) |
| `yh evidence` / `yh verification` | Persiste Evidence, planes, reportes y completion authorization | No | Trace, digest de Specification y HITM | `tests/verification/*.test.ts` |

## Reglas

- La escritura local bajo `.your-harness/state` usa identificadores validados, envelope versionado y escritura atómica.
- Sólo `yh change apply` modifica el árbol OpenSpec en la superficie estable; permanece detrás del materializer.
- `--json` cambia la representación de salida, pero no relaja guardrails ni evita auditoría.

## Cierre de la matriz

- [x] Workspace temporal externo al repositorio.
- [x] Apply exitoso y recovery idempotente con estado persistido.
- [x] Runner externo rechazado sin `process.execute`.
- [x] Path relativo fuera del workspace rechazado.
- [x] Recovery de Apply interrumpido, resolución HITM y replay idempotente desde proceso CLI.
- [x] Recovery con provider ya materializado (`materialized`) desde proceso CLI.
- [x] Recovery con provider divergente (`recovery-required`) sin resolución automática.
- [x] Retry explícito después de `apply-failed`, con nueva clave y `retryOfAttemptId`.
- [x] Ejecución `work execute` autorizada y rechazo por ausencia de scope HITM desde proceso CLI.
- [x] Instalación empaquetada: `change apply` sin `workspace.write` devuelve `CHANGE_APPLY_GUARDRAIL`/exit code `3` y conserva el Change original.
- [ ] Ejecutar cada caso desde un proceso CLI limpio y verificar código de salida, archivos y registros.
