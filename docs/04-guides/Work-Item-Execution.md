# Work Item Execution

```bash
yh work-item execute "Implement request validation" \
  --workspace . \
  --constraint "Run tests before reporting completion"
```

The command creates a temporary WorkItem and approved demonstration Specification, then executes the application-to-runtime vertical slice. A Pi-compatible runtime configuration is required for a real execution.

This is an integration entrypoint, not persistence: it does not save the WorkItem, load a user Specification, or transition WorkItem status.
