# Operational Persistence

YH persiste estado operacional propio por workspace bajo un directorio local ignorado por Git:

```text
.your-harness/
└── state/
    ├── work-items/<id>.json
    └── execution-traces/<id>.json
```

## Alcance

`createLocalOperationalStore({ workspace })` expone repositorios para `WorkItem` y `ExecutionTrace`. Los WorkItems se serializan con una versión de formato y se rehidratan como aggregates de Domain. Las trazas conservan Change/task provenance, Specification, WorkItem, runtime y RuntimeResult.

Las escrituras usan un archivo temporal seguido de `rename`, y los IDs persistidos aceptan sólo caracteres seguros para evitar escapes del directorio de estado.

## Fuente de verdad

Esta base no persiste copias de Specifications ni artefactos de OpenSpec. Las Specifications pertenecen al Engineering Core/proveedor SDD y OpenSpec continúa siendo una fuente read-only. La persistencia local sólo conserva estado operacional de YH y referencias hacia esa fuente.

## Límites actuales

- La CLI todavía compone repositorios demo en memoria.
- No hay locking multiproceso, índices secundarios ni migraciones entre versiones.
- No hay persistencia local de Specifications, Evidence o VerificationReport.
- La configuración por proyecto de runtime, proveedor SDD y policies sigue pendiente.
