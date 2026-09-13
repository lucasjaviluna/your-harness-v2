# Operational Persistence

YH persiste estado operacional propio por workspace bajo un directorio local ignorado por Git:

```text
.your-harness/
└── state/
    ├── work-items/<id>.json
    ├── execution-bindings/<work-item-id>.json
    ├── execution-traces/<id>.json
    ├── evidence/<id>.json
    ├── verification-plans/<id>.json
    ├── verification-reports/<id>.json
    └── completion-authorizations/<id>.json
```

## Alcance

`createLocalOperationalStore({ workspace })` expone repositorios para `WorkItem`, bindings de ejecución, `ExecutionTrace`, `Evidence`, `VerificationPlan` y `VerificationReport`. Los WorkItems se serializan con una versión de formato y se rehidratan como aggregates de Domain. Un binding selecciona una Specification SDD, Change/tareas opcionales y una autorización explícita de ejecución. Las trazas conservan Change/task provenance, WorkItem, runtime, RuntimeResult y un snapshot de Specification con provenance y digest.

Las escrituras usan un archivo temporal seguido de `rename`, y los IDs persistidos aceptan sólo caracteres seguros para evitar escapes del directorio de estado.

## Fuente de verdad

Esta base no persiste copias de Specifications ni artefactos de OpenSpec. Las Specifications pertenecen al proveedor SDD y OpenSpec continúa siendo una fuente read-only. La persistencia local conserva estado operacional de YH, Evidence/Verification y el snapshot auditable de la proyección usada; la CLI vuelve a leer el proveedor en cada ejecución.

## Límites actuales

- No hay locking multiproceso, índices secundarios ni migraciones entre versiones.
- No hay persistencia local de Specifications ni artefactos SDD; las decisiones operativas se persisten localmente.

El store también expone el repositorio de `CompletionAuthorization`; una autorización
explícita es la única entrada que puede completar un WorkItem.
