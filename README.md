# your-harness

`your-harness` (`yh`) es un harness CLI para trabajo de ingeniería asistido por IA. Separa el estado y conocimiento de ingeniería del runtime concreto que ejecuta una tarea.

## Estado

Prototipo temprano — Stage 1. El Engineering Core, el contrato de ejecución, el adapter inicial de Pi y el spike read-only de OpenSpec están implementados; persistencia, selección de proveedores por proyecto, guardrails y evidence continúan en evolución.

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
- `src/runtime/execution-environment.ts` define la envolvente mínima de workspace, capabilities, red, secretos y confirmaciones; todavía no habilita tools.
- `src/sdd/openspec` adapta material local de OpenSpec al port neutral `SddProvider`, sólo mediante lectura.
- `packages/application` aplica `ExecutionEligibilityPolicy` antes de ejecutar: Specification aprobada y, opcionalmente, trazabilidad SDD.

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

El comando `work-item execute` (alias `work execute`) usa actualmente un WorkItem y una Specification de demostración en memoria. Si no se indica `--runtime`, usa `fake` como runtime por defecto. También permite seleccionar `--runtime pi`; Pi sólo se registra cuando se solicita y ejecuta con todas las herramientas deshabilitadas (`noTools: "all"`).

El boundary se valida con dos adaptadores: `FakeRuntimeAdapter` en `tests/runtime/` y `PiRuntimeAdapter` en `src/runtime/pi/`.

## Documentación

- [Índice técnico](docs/INDEX.md)
- [Arquitectura](docs/02-architecture/System-Overview.md)
- [Flujo de ejecución](docs/02-architecture/Execution-Flow.md)
- [Estado de capacidades](docs/07-status/Capability-Map.md)
- [Roadmap](docs/07-status/Roadmap.md)
