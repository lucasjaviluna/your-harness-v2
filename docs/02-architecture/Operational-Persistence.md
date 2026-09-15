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
    ├── completion-authorizations/<id>.json
    ├── change-stage-approvals/<id>.json
    ├── change-draft-handoffs/<id>.json
    ├── change-materialization-audits/<id>.json
    ├── change-apply-transitions/<id>.json
    ├── execution-scope-selections/<work-item-id>.json
    └── tool-invocations/<id>.json
```

## Alcance

`createLocalOperationalStore({ workspace })` expone repositorios para `WorkItem`, bindings de ejecución, `ExecutionTrace`, `Evidence`, `VerificationPlan`, `VerificationReport`, `CompletionAuthorization`, `ChangeStageApproval`, `ChangeDraftHandoff`, `ChangeMaterializationAudit`, `ChangeApplyTransitionRecord`, `GovernedChangeRecord` y `ToolInvocationTrace`. Los WorkItems se serializan con una versión de formato y se rehidratan como aggregates de Domain. Un binding selecciona una Specification SDD, Change/tareas opcionales y una autorización explícita de ejecución. Las trazas conservan Change/task provenance, WorkItem, runtime, RuntimeResult y un snapshot de Specification con provenance y digest. Las aprobaciones de etapas, los handoffs, los eventos de materialización y las transiciones gobernadas conservan actor, rol, decisión/estado, versión y digest del Change; las invocaciones de tools conservan runtime, sesión, ruta, resultado, tamaño y motivo de denegación para auditoría.

Las escrituras usan un envelope físico `{ formatVersion, payload }` y un archivo temporal seguido de `rename`. Los IDs persistidos aceptan sólo caracteres seguros para evitar escapes del directorio de estado. Los JSON rehidratados se validan en el límite del adapter; el schema Zod del `ChangeDraftHandoff` valida la forma persistida y `createChangeDraftHandoff` conserva las invariantes del contrato.

### Versionado y migraciones

El contrato físico actual es `formatVersion: 1`. Los registros creados antes de este contrato, que tienen el payload en la raíz y no poseen envelope, se interpretan como legacy v1 y siguen siendo legibles. Los registros nuevos siempre se escriben con envelope, por lo que no se reescribe automáticamente el estado existente.

Las migraciones se registran explícitamente en `src/persistence/local/state-versioning.ts` y se ejecutan al leer un envelope de una versión anterior. Un formato futuro se rechaza con error explícito; YH no debe interpretar silenciosamente un estado cuyo contrato no conoce. El cambio de versión requiere agregar la migración, pruebas de compatibilidad y actualizar esta documentación.

## Fuente de verdad

Esta base no persiste copias de Specifications ni artefactos de OpenSpec. Las Specifications pertenecen al proveedor SDD y OpenSpec continúa siendo una fuente read-only. La persistencia local conserva estado operacional de YH, aprobaciones HITM, Evidence/Verification y el snapshot auditable de la proyección usada; la CLI vuelve a leer el proveedor en cada ejecución.

## Límites actuales

- No hay locking multiproceso ni índices secundarios. El registro de migraciones v1 está preparado, pero todavía no existe una migración histórica porque v1 es el primer envelope soportado.
- No hay persistencia local de Specifications ni artefactos SDD; las decisiones operativas se persisten localmente.
- Un `ChangeDraftHandoff` conserva el snapshot completo de Proposal/Design/Tasks revisado; no reemplaza la fuente de verdad OpenSpec.
- Un `ChangeMaterializationAudit` registra cada intento de `apply` sin mutar el handoff. `attemptId` identifica el intento, `idempotencyKey` evita repetir la misma solicitud lógica y `retryOfAttemptId` enlaza un retry explícito. Los eventos `succeeded` y `failed` son inmutables; repetir una clave devuelve el evento existente y un retry usa una clave nueva.
- Un `ChangeApplyTransitionRecord` persiste la secuencia operacional (`apply-ready`, `applying`, `materialized` o `apply-failed`) de forma independiente de la auditoría del resultado. Cada registro conserva estado anterior/nuevo, intento, clave idempotente, snapshot de versión/digest, actor y motivo; el handoff no se modifica.

El binding operacional conserva el digest de la proyección de Specification aprobada.
Antes de ejecutar, la CLI vuelve a proyectar el proveedor SDD y niega la ejecución si
el digest cambió o si el binding legado no tiene digest; en ambos casos exige volver a
hacer `work bind`. Una `CompletionAuthorization` explícita es la única entrada que
puede completar un WorkItem.
