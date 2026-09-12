# Boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| Domain | aggregates, value objects, lifecycle rules | prompts, provider SDKs, runtime sessions |
| Application | use cases, projections, ports | concrete AI runtime details |
| Runtime | prompt projection and execution | domain authority or WorkItem transitions |
| CLI | argument parsing and composition | business rules and provider-specific domain logic |
| Core/MCP | reusable harness infrastructure | application-domain ownership |

`EngineeringContext` is an application projection, not a domain aggregate and not a prompt. `ExecutionRequest` crosses the application/runtime boundary. `RuntimeResult` reports runtime output only.
