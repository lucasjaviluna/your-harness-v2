# Testing and Verification

```bash
npm test -- --run
npm run build
```

Current tests cover `ContextAssembler`, `ExecuteWorkItemUseCase` delegation and Pi prompt projection through a mocked Pi session. Tests use English `describe` and `it` descriptions. Code comments remain Spanish by project convention.

Before merging a runtime or contract change, run both commands above and update the capability map if the maturity of a feature changed.
