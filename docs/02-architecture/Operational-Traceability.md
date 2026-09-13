# Operational Traceability

`ExecutionTrace` es un registro operacional de Application que vincula el material de planificación SDD con una ejecución concreta:

```text
Change provenance + task references
              │
Specification + WorkItem
              │
        RuntimeResult
              ↓
       ExecutionTrace
```

## Contenido

Una traza contiene identificadores de WorkItem y Specification, un snapshot con provenance/digest de la Specification proyectada, una referencia opcional al Change, referencias a tareas del proveedor, el runtime elegido, el `RuntimeResult` y el instante de registro.

Change y tareas se representan únicamente mediante `SddProvenance` opaca. No se convierten en relaciones de Domain ni cruzan el Runtime Boundary: el runtime continúa recibiendo sólo `ExecutionRequest`.

## Registro

`ExecuteStoredWorkItemUseCase` puede recibir metadata de traza y un `ExecutionTraceRepository`. Una vez que el runtime devuelve su resultado, guarda la traza sin modificar el estado del WorkItem ni interpretar el resultado como aprobación o evidencia.

`InMemoryExecutionTraceRepository` sigue sirviendo para composición y tests. `createLocalOperationalStore()` aporta un `ExecutionTraceRepository` JSON bajo `.your-harness/state/execution-traces/` para conservar trazas entre procesos. `yh work execute` lo compone y guarda la traza después del runtime. No hay locking, índices ni almacenamiento de evidencia.
