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

1. ~~Completar la matriz E2E con todos los resultados de `change recover`.~~ **Completado:** el proceso CLI cubre `apply-failed`, replay idempotente, `materialized`, `recovery-required`, retry explícito y una colisión real de escritura que conserva el Change original y persiste la auditoría fallida.
2. ~~Definir versionado/migración de los JSON bajo `.your-harness/state`.~~ **Completado:** envelope v1, compatibilidad con registros legacy, rechazo explícito de formatos futuros, registro de migraciones y pruebas de compatibilidad; las migraciones futuras se agregan sólo cuando cambie el formato.
3. ~~Consolidar el contrato de configuración, errores CLI, códigos de salida y salida JSON.~~ **Completado para la superficie estable:** envelope y taxonomía definidos para `version`, `config`, `mode`, `provider`, `change`, `work`, `audit` y `verification`, con clasificación fina en los flujos críticos y administrativos y errores Commander normalizados. `plugin`, `skill`, `agent`, `workflow`, `spec` y `mcp` quedan explícitamente fuera de v0.1.0.
4. Agregar CI/CD mínimo: build, tests, lint, validación documental y empaquetado — completado; GitHub Actions pasó en runner limpio con Node 22.19/24.
5. ~~Reemplazar o aislar explícitamente los mocks/stubs que queden visibles en la superficie soportada.~~ **Completado:** ToolExecutor de agentes y workflows, y steps `command`/`script`, fallan cerrados; MCP y las demás familias experimentales quedan fuera del alcance estable.
6. ~~Probar instalación limpia y ejecución desde un workspace externo al repositorio.~~ **Completado:** `npm run verify:packed-install` genera el tarball, instala sus dependencias en un workspace temporal externo y ejecuta `yh version --json`; `prepack` construye los artefactos de los paquetes locales.
7. ~~Cerrar la revisión de seguridad de paths, capabilities y confirmaciones en todos los comandos que escriben.~~ **Completado:** boundary y materializer revisados; la evidencia está en `Security-Review.md` y la matriz de efectos en `Write-Command-Matrix.md`; los flujos principales tienen E2E de proceso y la instalación empaquetada verifica que `change apply` sin `workspace.write` no modifica el Change. El lock multiproceso queda fuera de v0.1.0 como riesgo aceptado.
8. Publicar una matriz de capabilities y limitaciones para evitar prometer orquestación aún no implementada — matriz inicial publicada; queda mantenerla sincronizada con cada capability nueva.

## Estado estimado

La estimación es cualitativa y depende de mantener este alcance:

- **Base gobernada/CLI:** avanzada; la mayor parte del flujo está implementada.
- **Hardening de release:** avanzado pero incompleto; CI, versionado, seguridad, instalación empaquetada y E2E críticos están cubiertos; quedan escenarios secundarios y decisión final sobre lock multiproceso.
- **Visión completa de your-harness:** temprana; TaskOrchestrator, agente de ejecución, MCP y workflows reales aún son fases posteriores.

Como orientación de planificación, el proyecto está aproximadamente en **90–95% del v0.1.0 acotado** y en **35–45% de la visión completa**. El alcance funcional y de hardening está cerrado; resta consolidar el release candidate, confirmar CI sobre el commit final y crear la etiqueta/publicación. Son rangos de trabajo, no una métrica de calidad ni una promesa de calendario.

## Regla de release

El release estable debe optimizar por confiabilidad del flujo gobernado, no por cantidad de integraciones. Un componente puede quedar fuera del release si su inclusión obliga a relajar HITM, provenance, auditabilidad, atomicidad o los límites de responsabilidad entre proveedor, Application y adapter.

## Próxima secuencia propuesta

1. ~~Cerrar E2E y contrato final de `recover`.~~ **Completado:** Apply/Recover cubren éxito, fallos, recovery, idempotencia, retry y colisión real de escritura desde proceso CLI.
2. ~~Definir formato versionado y estrategia de migración de persistencia local.~~ **Completado:** contrato v1 y registro explícito de migraciones implementados y documentados.
3. ~~Consolidar CLI/JSON/errores y matriz de capabilities.~~ **Completado en la superficie soportada:** contrato JSON/errores y matriz inicial publicados; las familias experimentales permanecen fuera del alcance estable.
4. ~~Incorporar CI/CD y prueba de instalación limpia.~~ **Completado:** GitHub Actions ejecuta `npm ci`, build, tests, lint, documentación y empaquetado en Node 22.19/24.
5. ~~Ejecutar la matriz E2E de seguridad, completar la checklist de `Security-Review.md` y congelar el alcance v0.1.0.~~ **Completado para release:** los flujos críticos, el guardrail de escritura desde instalación empaquetada y los riesgos aceptados están documentados; la matriz exhaustiva de todos los comandos queda como hardening posterior.
6. ~~Consolidar el release candidate: commit final, CI verde, etiqueta y publicación de `v0.1.0`.~~ **Completado:** `v0.1.0` fue etiquetada y publicada con CI verde.
7. ~~Después iniciar el diseño de `TaskOrchestrator` como consumidor de estos contratos.~~ **Primer incremento implementado:** ADR-013 y el planner read-only de Application preservan todos los gates HITM; integrar el snapshot durable y una consulta CLI queda como trabajo posterior al release.
