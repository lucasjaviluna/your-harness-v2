# SDD Providers

`SddProvider` es un port de Application para leer material SDD sin acoplar el Engineering Core a una herramienta, formato o CLI concreto.

La propuesta de estados neutrales para Specifications y Changes está documentada en [ADR-010](../adr/ADR-010.md). El límite de escritura y sincronización está propuesto por separado en [ADR-011](../adr/ADR-011.md), para que un proveedor read-only no obtenga permisos de modificación por accidente.

## Contrato mínimo

El contrato público está en `@your-harness/application` y devuelve una proyección neutral de:

- Specifications actuales con Requirements normativos y Scenarios WHEN/THEN.
- Changes propuestos, con rationale, tareas y referencias opacas a artefactos.
- Provenance con `providerId` y una referencia estable propiedad del proveedor.
- `contentDigest` estable por Specification proyectada, calculado por el proveedor y usado por Application para detectar drift.

Application expone `SddDriftReport` mediante `evaluateSddDrift`. El resultado distingue `match`, `missing-approved-digest` y `digest-mismatch`, para que las políticas, el agente y la UX puedan explicar la decisión sin depender de analizar mensajes de excepción.

Un `Change` proyectado no es un aggregate de Domain, no modifica una `Specification` actual y no se relaciona directamente con un `WorkItem`.

Las proyecciones de Changes y tareas incluyen estados normalizados. `SddChangeStatus` describe únicamente lo que el proveedor puede demostrar; `SddTaskStatus` comienza con `pending`, `completed` y `unknown`. El estado operacional de your-harness se representa por separado mediante `GovernedChangeStatus` y no se deriva de forma implícita desde OpenSpec.

La aprobación de un Change es incremental: Proposal, Design, Task Plan y Apply Readiness requieren checkpoints HITM independientes. Design es el gate arquitectónico obligatorio antes de aplicar efectos o iniciar la implementación; si se modifica, las aprobaciones posteriores deben invalidarse.

Application expone `ChangeStageApproval` y su repositorio para conservar cada decisión de forma inmutable. La aprobación queda ligada al digest y versión revisados; por eso una nueva proyección no puede reutilizar silenciosamente una aprobación anterior.

Cuando una ejecución necesita observabilidad, Application puede asociar referencias opacas de Change y tareas en un `ExecutionTrace`. La asociación se conserva fuera de los aggregates y del Runtime; ver [Operational traceability](Operational-Traceability.md).

## Spike OpenSpec

`OpenSpecSddProvider` vive en `src/sdd/openspec/` y es read-only. Lee los directorios locales convencionales:

```text
openspec/
├── specs/<capability>/spec.md
└── changes/<change>/
    ├── proposal.md
    ├── design.md
    ├── tasks.md
    └── specs/**/*.md
```

El adapter usa sólo operaciones de lectura del filesystem. No invoca el CLI de OpenSpec, no escribe archivos, no sincroniza checklists y no crea WorkItems. Si no existe `openspec/`, falla de forma explícita.

## Selección por proyecto

La configuración local puede declarar `runtime.sddProvider: openspec`. `createProjectRuntimeEnvironment` compone ese adapter como `SddProvider` sin hacer que sus tipos crucen a Domain ni a Runtime. Es la única opción disponible; un valor desconocido se rechaza durante validación de configuración.

`yh work bind` conserva sólo una selección operacional de Specification, Change y tareas. Al ejecutar, YH vuelve a leer el proveedor para proyectar material actual y compara el `contentDigest` de la Specification con el snapshot aprobado. La autorización `--approve-specification` es explícita porque OpenSpec no proporciona `SpecificationStatus.Approved` de Domain.

## Límites actuales

El spike todavía no añade planificación desde tareas, escritura de artefactos ni lifecycle de Change. `yh work execute` sí lee el proveedor configurado y proyecta el material actual en Application para construir la solicitud de ejecución; no construye aggregates de Domain desde tipos OpenSpec ni pasa tipos del proveedor al Runtime.
