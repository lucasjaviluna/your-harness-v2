# Execution Eligibility

`ExecutionEligibilityPolicy` es un guardrail de Application evaluado antes de construir un `ExecutionRequest`.

## Reglas actuales

1. La `Specification` debe estar aprobada.
2. Cuando `requireSddChangeTraceability` está activo, la ejecución debe aportar una referencia neutral a un Change mediante `SddChangeReference`.

La segunda regla se apoya en `ExecutionTrace`: no transforma Change o tareas en relaciones de Domain y no envía provenance SDD al Runtime.

## Resultado

La política devuelve una decisión con `eligible` y razones normalizadas:

- `SPECIFICATION_NOT_APPROVED`
- `SDD_CHANGE_TRACEABILITY_REQUIRED`

Una denegación impide la llamada al `RuntimePort`. No modifica WorkItems, no aprueba Specifications y no interpreta `RuntimeResult`.

La exigencia de trazabilidad SDD es configurable al crear la política y permanece desactivada por defecto mientras no haya configuración por proyecto.
