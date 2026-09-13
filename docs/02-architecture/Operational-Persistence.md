# Operational Persistence

YH persiste estado operacional propio por workspace bajo un directorio local ignorado por Git:

```text
.your-harness/
└── state/
    ├── work-items/<id>.json
    ├── execution-bindings/<work-item-id>.json
    └── execution-traces/<id>.json
```

## Alcance

`createLocalOperationalStore({ workspace })` expone repositorios para `WorkItem`, bindings de ejecución y `ExecutionTrace`. Los WorkItems se serializan con una versión de formato y se rehidratan como aggregates de Domain. Un binding selecciona una Specification SDD, Change/tareas opcionales y una autorización explícita de ejecución. Las trazas conservan Change/task provenance, Specification, WorkItem, runtime y RuntimeResult.

Las escrituras usan un archivo temporal seguido de `rename`, y los IDs persistidos aceptan sólo caracteres seguros para evitar escapes del directorio de estado.

## Fuente de verdad

Esta base no persiste copias de Specifications ni artefactos de OpenSpec. Las Specifications pertenecen al proveedor SDD y OpenSpec continúa siendo una fuente read-only. La persistencia local sólo conserva estado operacional de YH y referencias hacia esa fuente; la CLI vuelve a leer el proveedor en cada ejecución.

## Límites actuales

- No hay locking multiproceso, índices secundarios ni migraciones entre versiones.
- No hay persistencia local de Specifications, Evidence o VerificationReport.
