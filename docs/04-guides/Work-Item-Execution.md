# Work Item Execution

```bash
yh work execute demo-work-item \
  --objective "Implement request validation" \
  --runtime fake \
  --workspace . \
  --constraint "Run tests before reporting completion"
```

The command creates a temporary WorkItem with the requested identifier and an approved demonstration Specification, then executes the application-to-runtime vertical slice through the selected runtime (`fake` or `pi`). For a real Pi execution, a Pi-compatible runtime configuration is required.

The application layer loads the WorkItem and Specification through `ExecuteStoredWorkItemUseCase` and repository ports. The CLI still uses temporary in-memory data until persistent repositories are connected. It does not transition WorkItem status automatically.
