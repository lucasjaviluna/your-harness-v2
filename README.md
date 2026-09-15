# your-harness

`your-harness` (`yh`) es un harness CLI para trabajo de ingeniería asistido por IA. Separa el estado y conocimiento de ingeniería del runtime concreto que ejecuta una tarea.

## Estado

Prototipo temprano — Stage 1. El Engineering Core, el contrato de ejecución, el adapter inicial de Pi, el provider read-only de OpenSpec con materialización gobernada de Changes, la composición configurable por proyecto, la integración persistente de la CLI y el ciclo CLI acotado de verification/evidence están implementados.

## Arquitectura actual

```text
packages/shared
      ↓
packages/domain
      ↓
packages/application
      ↑ RuntimePort
src/runtime/pi
      ↑ composición
src/cli
```

- `packages/domain` contiene aggregates y reglas del Engineering Core.
- `packages/application` contiene casos de uso, proyecciones, ports y trazas operacionales de ejecución.
- `src/runtime/pi` adapta Pi al `RuntimePort` sin exponer tipos de Pi al Core.
- `src/cli` compone temporalmente el flujo de ejecución.
- `src/runtime/project-runtime-environment.ts` resuelve desde `config.yml` el runtime por defecto, proveedor SDD, trazabilidad requerida y política de entorno; Pi sólo habilita la tool `read` cuando `workspace.read` está explícitamente configurado.
- `src/runtime/project-runtime-environment.ts` compone el materializer SDD configurado: filesystem por defecto o external-command sólo con runner inyectado.
- `yh change inspect/status` ofrece la primera fachada read-only de alto nivel para Changes, provenance, digest, lifecycle HITM y aprobaciones obsoletas.
- `yh change propose/review` crea y muestra un handoff durable con el snapshot completo de Proposal/Design/Tasks, sin escribir OpenSpec ni aprobar etapas.
- `yh change approve` registra decisiones HITM inmutables ligadas al handoff, versión y digest exactos; no materializa cambios.
- `yh change apply` materializa sólo un handoff con Apply Readiness aprobada, confirmación explícita y base digest vigente; registra una auditoría durable e inmutable de cada intento, exitoso o fallido. Cada intento tiene `attemptId`, `idempotencyKey` y, opcionalmente, `retryOfAttemptId`; repetir una clave devuelve el evento existente y un retry requiere una clave nueva.
- `src/sdd/openspec` adapta material local de OpenSpec al port neutral `SddProvider`, sólo mediante lectura.
- `src/sdd/openspec` también expone un `SddMaterializer` gobernado para crear o reemplazar Changes. Las actualizaciones exigen `baseContentDigest`; no modifica `openspec/specs/**`.
- `packages/application` aplica `ExecutionEligibilityPolicy` antes de ejecutar: Specification aprobada y, opcionalmente, trazabilidad SDD.
- `src/persistence/local` persiste WorkItems, bindings operacionales y ExecutionTraces bajo `.your-harness/state/`, sin duplicar Specifications u OpenSpec.
- `packages/application/verification` define Evidence y VerificationPlan/Report; Evidence se ancla a una ExecutionTrace existente, sin completar WorkItems automáticamente.
- Las trazas nuevas incluyen provenance y digest de la Specification proyectada; Evidence y VerificationPlan/Report también tienen almacenamiento operacional local.
- `work bind` conserva el digest de la Specification aprobada y `work execute` rechaza drift SDD antes de invocar el runtime; un cambio exige volver a enlazar el WorkItem.
- `CompletionAuthorization` es la única ruta de Application que puede completar un WorkItem; la CLI exige report, actor, rol y motivo explícitos, y aplica una política HITM de decisiones permitidas por rol.
- La CLI ya expone `work start` y `work authorize`; la autorización exige un VerificationReport y registra actor, motivo y decisión antes de completar.
- `audit trace <execution-trace-id>` inspecciona una ejecución junto con sus `ToolInvocationTrace` correlacionadas; la auditoría sigue separada de Evidence.
- `audit work-item <work-item-id>` permite consultar todas las ejecuciones del WorkItem; ambos comandos aceptan `--from`, `--to` y `--json`.
- Los comandos `change` soportados mantienen payloads JSON de éxito y emiten errores JSON con `{ ok: false, error: { code, message } }` y exit code `1` cuando se usa `--json`.
- Las operaciones `work` y `verification` también aceptan `--json`; `audit` ya ofrece payloads JSON y ahora normaliza sus errores con el mismo contrato.
- `version`, `config`, `mode` y `provider` ofrecen JSON para consultas y validaciones básicas; los comandos experimentales de extensiones, agentes, workflows y MCP aún requieren una revisión de estabilidad independiente.
- Los errores JSON incluyen `error.exitCode`; la taxonomía reservada es `1` inesperado, `2` uso, `3` guardrail/HITM, `4` no encontrado, `5` conflicto y `6` proveedor externo. La clasificación fina se incorpora progresivamente.
- Los errores de uso generados por Commander se emiten como `CLI_USAGE_ERROR` con exit code `2`, incluyendo comandos u opciones desconocidas y opciones obligatorias ausentes.
- `work select <work-item-id>` registra el alcance HITM confirmado de Requirements y Scenarios; `work execute` exige esa selección y rechaza su digest si quedó obsoleto.

## Instalación y verificación

```bash
npm ci
npm run build
npm test -- --run
```

El workspace usa `package-lock.json` como fuente reproducible para npm. Usá `npm install` sólo al modificar dependencias y commiteá el lockfile resultante.

Verificación independiente del Core y del runtime Pi:

```bash
npm run verify:core
npm run verify:pi
```

## Uso

```bash
npm start -- --help
npm start -- work execute demo-work-item --objective "Implementar validación" --runtime fake --workspace .
```

El comando `work-item execute` (alias `work execute`) carga un WorkItem persistido, resuelve su binding contra el proveedor SDD actual, aplica elegibilidad y guarda una traza durable. Primero se debe ejecutar `work create` y `work bind --approve-specification`; la aprobación no se infiere de un archivo OpenSpec. Si no se indica `--runtime`, usa `runtime.defaultRuntime` de la configuración del proyecto (por defecto, `fake`). Pi sólo habilita lectura cuando la capability `workspace.read` está explícitamente configurada; las demás tools siguen deshabilitadas.

El boundary se valida con dos adaptadores: `FakeRuntimeAdapter` en `tests/runtime/` y `PiRuntimeAdapter` en `src/runtime/pi/`.

## Documentación

- [Índice técnico](docs/INDEX.md)
- [Arquitectura](docs/02-architecture/System-Overview.md)
- [Flujo de ejecución](docs/02-architecture/Execution-Flow.md)
- [Configuración por proyecto](docs/05-reference/Project-Configuration.md)
- [Estado de capacidades](docs/07-status/Capability-Map.md)
- [Roadmap](docs/07-status/Roadmap.md)
