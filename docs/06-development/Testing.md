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
- Pi prompt projection, result mapping and session disposal.

The dedicated Runtime Boundary test lives under `tests/runtime/` and validates the first executable engineering slice: approved Specification + WorkItem → `ExecuteWorkItemUseCase` → `ExecutionRequest` → fake runtime → `RuntimeResult`.

Los tests del Core y del Runtime consumen las APIs públicas `@your-harness/domain` y `@your-harness/application`; no importan rutas físicas bajo `packages/*/src`.

Tests use English `describe` and `it` descriptions. Code comments remain Spanish by project convention.

Before merging a runtime or contract change, run the full build and tests plus the relevant separated verification. Update architecture, capability and roadmap documents whenever their described state changes.
