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

Las invocaciones de tools son registros operacionales independientes. Cuando la composición conoce el ID de la ejecución, Pi conserva ese `executionTraceId` en cada `ToolInvocationTrace`; el repositorio permite consultarlas por esa clave y `yh audit trace` presenta la ejecución junto con sus invocaciones correlacionadas. Esta correlación no convierte una invocación en `Evidence`: para participar en verificación debe registrarse explícitamente mediante el flujo de Application correspondiente.

`InMemoryExecutionTraceRepository` sigue sirviendo para composición y tests. `createLocalOperationalStore()` aporta un `ExecutionTraceRepository` JSON bajo `.your-harness/state/execution-traces/` para conservar trazas entre procesos. `yh work execute` lo compone y guarda la traza después del runtime. Evidence, VerificationPlan, VerificationReport y CompletionAuthorization tienen repositorios locales separados; todavía no hay locking multiproceso ni índices secundarios.
