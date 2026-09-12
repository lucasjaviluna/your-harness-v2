# Your Harness Documentation

This is the living technical documentation for `your-harness` (`yh`). It describes the implemented system first; planned or partial capabilities are labelled explicitly.

## Reading paths

| Goal | Start here |
| --- | --- |
| Understand the platform | [System overview](02-architecture/System-Overview.md) |
| Follow an execution | [Execution flow](02-architecture/Execution-Flow.md) |
| Run the CLI | [Getting started](04-guides/Getting-Started.md) and [work item execution](04-guides/Work-Item-Execution.md) |
| Change the codebase | [Boundaries](02-architecture/Boundaries.md) and [Testing](06-development/Testing.md) |
| Check maturity | [Capability map](07-status/Capability-Map.md) and [Roadmap](07-status/Roadmap.md) |

## Documentation map

- `00-foundation/`: vision, governance and engineering principles.
- `01-domain/`: domain language and core concepts.
- `02-architecture/`: technical topology, boundaries and flows.
- `03-runtime/`: runtime adapters, prompts and tool policy.
- `04-guides/`: installation and operational use.
- `05-reference/`: CLI and public contracts.
- `06-development/`: contribution and verification practices.
- `07-status/`: implementation status and near-term direction.
- `adr/` and `rfc/`: durable decisions and proposals.

## Maintenance rule

Update the relevant document in the same change set whenever a public command, boundary, contract, runtime capability, or implementation status changes. The Markdown documents are the technical source of truth; `documentation-report/` contains visual snapshots derived from them.
