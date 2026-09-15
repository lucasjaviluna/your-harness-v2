# Revisión de seguridad del primer release

## Alcance

Esta revisión cubre las operaciones que pueden modificar el workspace o el estado operacional local en `v0.1.0`: materialización de Changes OpenSpec, persistencia bajo `.your-harness/state`, composición del runtime y comandos CLI gobernados. El objetivo es comprobar que HITM y el boundary de ejecución no sean sólo convenciones documentales.

## Invariantes verificadas

| Invariante | Control | Evidencia |
|---|---|---|
| No escribir fuera del workspace | `ExecutionEnvironmentGuard` valida containment para cada path; `allowedPaths` relativos se resuelven contra la raíz configurada | `tests/runtime/execution-environment.test.ts` |
| No escribir sin capability | La materialización exige `workspace.write` y modo `read-write` | `tests/sdd/openspec-materializer.test.ts` |
| No ejecutar generación externa implícitamente | El runner se inyecta; la estrategia declara `process.execute` y una risk class propia | `src/sdd/openspec/openspec-generation-strategy.ts` |
| No ejecutar una operación de riesgo sin HITM | `requireConfirmation` aplica `always` por defecto y el materializer exige confirmación explícita | `src/runtime/execution-environment.ts`, `tests/sdd/openspec-materializer.test.ts` |
| No aplicar contra un snapshot obsoleto | Se valida el digest base antes de escribir y se relee el provider después de materializar | `src/sdd/openspec/openspec-materializer.ts` |
| No dejar una escritura parcial | Se escribe en staging, se verifica el digest y se usa rename atómico con rollback para reemplazos | `src/sdd/openspec/openspec-materializer.ts` |
| No corromper el estado local | Los registros usan envelope versionado y escritura temporal atómica; formatos futuros se rechazan | `src/persistence/local/state-versioning.ts`, `tests/persistence/local-operational-store.test.ts` |
| No filtrar secretos por configuración | La política de secretos usa allowlist explícita y los secretos no forman parte del YAML de proyecto | `src/runtime/execution-environment.ts`, `docs/07-status/Capability-Map.md` |

## Decisión de release

La superficie estable puede declararse gobernada para operaciones locales porque cada escritura soportada pasa por una capability, un boundary de workspace, una confirmación HITM y una validación de integridad cuando corresponde. Esta conclusión no implica que el sistema sea un sandbox de seguridad fuerte ni que cualquier comando arbitrario sea seguro de ejecutar.

## Riesgos residuales aceptados para `v0.1.0`

- No hay lock multiproceso: dos procesos concurrentes podrían competir por el mismo Change. La mitigación actual es la revalidación de digest, la atomicidad y la recuperación explícita; el lock queda para hardening posterior.
- Un runner externo no está sandboxeado por el sistema operativo. Sólo se habilita mediante capability, confirmación, `cwd` explícito, `shell: false` y timeout; no debe considerarse aislamiento contra un proceso malicioso.
- La matriz completa de comandos y escenarios de escritura todavía debe convertirse en una checklist E2E antes de etiquetar el release.
- MCP, `ToolExecutor` general y steps `command`/`script` permanecen fuera de la superficie estable; sus rutas experimentales fallan cerrado o requieren integración explícita.

## Checklist de cierre

- [x] Boundary de paths revisado, incluyendo paths relativos.
- [x] Capabilities y confirmaciones revisadas en el materializer.
- [x] Digest base y digest posterior revisados.
- [x] Persistencia local versionada y atómica revisada.
- [ ] Ejecutar matriz E2E de cada comando que escribe, incluyendo workspace externo.
- [ ] Decidir si el lock multiproceso entra en `v0.1.0` o queda formalmente fuera.
