# Testing and Verification

```bash
npm run build
npm test -- --run
```

The full build uses TypeScript project references and compiles `shared`, `domain`, `application` and the root CLI/runtime project in dependency order.

Use the separated verification commands when changing an architectural boundary:

```bash
npm run verify:core
npm run verify:pi
```

`verify:core` compiles Shared → Domain → Application and runs the Core/Application tests without importing Pi. `verify:pi` compiles the full graph and runs only the Pi adapter integration test with its SDK mocked.

Current tests cover:

- `ContextAssembler` approval and projection rules;
- `ExecuteWorkItemUseCase` delegation through `FakeRuntimeAdapter`;
- the complete repository-backed Core flow through a `FakeRuntimePort`;
- Pi prompt projection, result mapping and session disposal;
- CLI composition and the persistent `work` plus Evidence/Verification flow both in-process and as a child process;
- SDD projection, durable traceability, Evidence/Verification evaluation and CompletionAuthorization.

The dedicated Runtime Boundary test lives under `tests/runtime/` and validates the first executable engineering slice: approved Specification + WorkItem → `ExecuteWorkItemUseCase` → `ExecutionRequest` → fake runtime → `RuntimeResult`.

The CLI composition test uses injected `CliContext` IO, so command behavior can be
verified without spawning a process. The persistent CLI test remains as a process-level
regression for the durable workspace flow.

Los tests del Core y del Runtime consumen las APIs públicas `@your-harness/domain` y `@your-harness/application`; no importan rutas físicas bajo `packages/*/src`.

Tests use English `describe` and `it` descriptions. Code comments remain Spanish by project convention.

Before merging a runtime or contract change, run the full build and tests plus the relevant separated verification. Update architecture, capability and roadmap documents whenever their described state changes.

## CI

El workflow de GitHub Actions ejecuta sobre Node 22.19 y 24: `npm ci`, build, suite Vitest con un único fork, lint, validación documental y `npm pack --dry-run`. El mínimo Node 22.19 se debe a `@earendil-works/pi-coding-agent`, que usa APIs no disponibles en Node 20. La instalación usa exclusivamente `package-lock.json`; si el lockfile no coincide con `package.json`, `npm ci` falla. `check:docs` valida la presencia de la documentación mínima y del contrato CLI publicado.
