# SDD Providers

`SddProvider` es un port de Application para leer material SDD sin acoplar el Engineering Core a una herramienta, formato o CLI concreto.

## Contrato mínimo

El contrato público está en `@your-harness/application` y devuelve una proyección neutral de:

- Specifications actuales con Requirements normativos y Scenarios WHEN/THEN.
- Changes propuestos, con rationale, tareas y referencias opacas a artefactos.
- Provenance con `providerId` y una referencia estable propiedad del proveedor.

Un `Change` proyectado no es un aggregate de Domain, no modifica una `Specification` actual y no se relaciona directamente con un `WorkItem`.

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

## Límites actuales

El spike todavía no añade selección/configuración de proveedores por proyecto, persistencia operacional, planificación desde tareas, escritura de artefactos ni lifecycle de Change. Ningún tipo de OpenSpec cruza al Domain ni al Runtime.
