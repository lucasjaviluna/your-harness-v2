# Primer release estable — propuesta de alcance

## Objetivo

El primer release estable de `your-harness` no pretende completar todavía la visión de un agente autónomo. Debe entregar una base CLI gobernada, auditable y reproducible para trabajar con Changes SDD, manteniendo HITM y los guardrails como invariantes.

La propuesta es tratarlo como un **v0.1.0 Governed Change Foundation**: una versión estable de la base operacional sobre la que después se construirá `TaskOrchestrator`.

## Incluido en el release

- Instalación reproducible con npm, build compuesto y una matriz de verificación automatizada.
- Fachada `yh change` estable: `inspect`, `status`, `propose`, `review`, `approve`, `apply` y `recover`.
- Flujo HITM explícito por Proposal, Design, Task Plan, Apply Readiness y Verification/Completion.
- `ChangeDraftHandoff` inmutable con snapshot completo, provenance y digest.
- Materialización OpenSpec filesystem con staging atómico, rollback, verificación posterior y protección contra drift.
- Auditoría durable de cada Apply, incluyendo fallos, retries, idempotencia y recuperación HITM.
- Persistencia local validada, con contratos de formato y migración/versionado definido.
- Flujo operacional WorkItem → ejecución → Verification/Evidence → CompletionAuthorization.
- Guardrails de workspace, capabilities, red, secretos y confirmaciones con defaults deny-by-default.
- Documentación de arquitectura, comandos, contratos, limitaciones y ejemplos reproducibles.

## Fuera de alcance del primer release

- `TaskOrchestrator` autónomo y skills que oculten completamente todos los comandos internos.
- Transporte MCP real y ejecución general de tools.
- Reemplazo de los stubs de `ToolExecutor` y de steps `command`/`script` del workflow.
- Runner oficial de OpenSpec/skills externo como dependencia obligatoria.
- Sincronización completa de `openspec/specs/**`, tareas y efectos de Specification.
- Soporte de producción para múltiples proveedores AI o runtimes con contratos de operación equivalentes.

## Gaps para declarar el release estable

1. Completar la matriz E2E con una interrupción real de proceso y replay idempotente en todos los resultados de `change recover`; ya existe cobertura E2E sobre estado persistido.
2. Definir versionado/migración de los JSON bajo `.your-harness/state` — contrato v1 implementado; quedan migraciones futuras sólo cuando cambie el formato.
3. Consolidar el contrato de configuración, errores CLI, códigos de salida y salida JSON — envelope y taxonomía definidos; implementado para `version`, `config`, `mode`, `provider`, `change`, `work`, `audit` y `verification`, con clasificación fina en los flujos críticos y errores de parseo Commander normalizados. Falta completar casos secundarios y extenderlo a comandos experimentales.
4. Agregar CI/CD mínimo: build, tests, lint, validación documental y empaquetado — completado; GitHub Actions pasó en runner limpio con Node 22.19/24.
5. Reemplazar o aislar explícitamente los mocks/stubs que queden visibles en la superficie soportada — ToolExecutor y steps `command`/`script` ahora fallan cerrados; MCP y otras familias experimentales siguen fuera del alcance estable.
6. Probar instalación limpia y ejecución desde un workspace externo al repositorio.
7. Cerrar la revisión de seguridad de paths, capabilities y confirmaciones en todos los comandos que escriben.
8. Publicar una matriz de capabilities y limitaciones para evitar prometer orquestación aún no implementada.

## Estado estimado

La estimación es cualitativa y depende de mantener este alcance:

- **Base gobernada/CLI:** avanzada; la mayor parte del flujo está implementada.
- **Hardening de release:** incompleto; faltan CI, migraciones, E2E y contrato de distribución.
- **Visión completa de your-harness:** temprana; TaskOrchestrator, agente de ejecución, MCP y workflows reales aún son fases posteriores.

Como orientación de planificación, el proyecto está aproximadamente en **65–75% del v0.1.0 acotado** y en **35–45% de la visión completa**. Son rangos de trabajo, no una métrica de calidad ni una promesa de calendario.

## Regla de release

El release estable debe optimizar por confiabilidad del flujo gobernado, no por cantidad de integraciones. Un componente puede quedar fuera del release si su inclusión obliga a relajar HITM, provenance, auditabilidad, atomicidad o los límites de responsabilidad entre proveedor, Application y adapter.

## Próxima secuencia propuesta

1. Cerrar E2E y contrato final de `recover`.
2. Definir formato versionado y estrategia de migración de persistencia local.
3. Consolidar CLI/JSON/errores y matriz de capabilities.
4. ~~Incorporar CI/CD y prueba de instalación limpia.~~ **Completado:** GitHub Actions ejecuta `npm ci`, build, tests, lint, documentación y empaquetado en Node 22.19/24.
5. Ejecutar una revisión de release con checklist y congelar el alcance v0.1.0.
6. Recién después iniciar el diseño de `TaskOrchestrator` como consumidor de estos contratos.
