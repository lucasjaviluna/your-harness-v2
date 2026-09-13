# Work Item Execution

The execution command uses durable YH-owned operational state and current material from the configured SDD provider.

```bash
yh work create login-work --title "Implement login"
yh work bind login-work --specification authentication --approve-specification --change add-login --task "openspec/changes/add-login/tasks.md#1"
yh work execute login-work --runtime fake --workspace . --constraint "Run tests before reporting completion"
```

`create` persists the WorkItem. `bind` records an operational association, outside Domain, with the selected SDD Specification and optional Change/tasks. `--approve-specification` is required deliberately: OpenSpec does not expose the Domain approval lifecycle, so selecting a file cannot silently authorize execution.

`execute` loads the WorkItem and binding, reads the configured SDD provider, projects the selected Specification, evaluates `ExecutionEligibilityPolicy`, resolves the selected `RuntimePort`, and persists an `ExecutionTrace`. It does not transition the WorkItem automatically.
