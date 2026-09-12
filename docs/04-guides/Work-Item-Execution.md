# Work Item Execution

```bash
yh work-item execute "Implement request validation" \
  --workspace . \
  --constraint "Run tests before reporting completion"
```

The command creates a temporary WorkItem and approved demonstration Specification, then executes the application-to-runtime vertical slice. A Pi-compatible runtime configuration is required for a real execution.

The application layer now provides repository-backed loading through `ExecuteStoredWorkItemUseCase` and reusable in-memory repositories. The CLI command still uses temporary demonstration data until persistent repositories and user-facing identifiers are connected. It does not transition WorkItem status automatically.
