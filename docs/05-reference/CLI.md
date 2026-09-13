# CLI Reference

The executable name is `yh`.

| Area | Commands |
| --- | --- |
| General | `version`, `config`, `mode` |
| Providers | `provider list`, `provider use`, `provider test` |
| Extensions | `plugin`, `skill`, `agent` |
| Integration | `mcp`, `workflow`, `spec` |
| Execution | `work-item execute <work-item-id>` (`work execute` alias) |

Run `yh <command> --help` for command-specific options. The execution command accepts `--workspace`, `--constraint`, `--objective` and `--runtime <fake|pi>`. The CLI composition root currently offers Fake and Pi runtimes; persistent WorkItem lookup is not implemented yet.
