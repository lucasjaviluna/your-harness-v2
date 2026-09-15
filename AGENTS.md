# AGENTS.md

## Project

`your-harness` (`yh`) — CLI-first AI dev harness. TypeScript, Node 20+, Commander.js, Zod, pino.
Early prototype (Stage 1). Core interfaces exist; many critical paths return mock/stub data.

## Setup

```bash
npm install          # install root dependencies and local workspace packages
cp .env.example .env # API keys for providers (COPILOT_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY, OLLAMA_HOST)
```

## Commands

```bash
npm run dev          # tsx watch src/cli/index.ts
npm run build        # tsc -b project graph → package dist/ folders + root dist/
npm run build:core   # build shared → domain → application without root runtime
npm run start        # node dist/src/cli/index.js
npm run test         # vitest
npm run verify:core  # build/test Engineering Core and Application without Pi
npm run verify:pi    # build full graph and test Pi adapter separately
npm run lint         # eslint src/ — see Known Gaps
npm run format       # prettier --write src/ — see Known Gaps
```

## Architecture

Two architectural areas coexist and are connected through package contracts:

### `src/` — The CLI harness tool
```
src/
├── cli/index.ts         ← CLI entrypoint mínimo (yh binary)
│   ├── create-program.ts ← composition root de Commander
│   ├── commands/        ← registro por familia de comandos
│   └── composition/     ← dependencias compartidas de comandos
├── core/                ← Interfaces + infra: config, events, context, logger
│   ├── ai/              ← AIProvider interface, AIManager, AIRegistry
│   ├── mcp/             ← MCPConnector interface, MCPManager, MCPRegistry
│   └── prompt/          ← Composable system prompt builder + registry
├── connectors/          ← AI providers: claude, openai, copilot, local (Ollama), custom
├── agents/              ← Agent definitions + AgentRunner (reasoning loop with tool calls)
├── plugins/             ← Plugin loader/manager with lifecycle hooks
├── skills/              ← Prompt templates + tools, categorized
├── workflows/           ← DAG-based workflow engine (8 step types)
├── mcp/                 ← MCP client/server (skeleton JSON-RPC, mocks only)
├── persistence/         ← Local operational persistence for WorkItems and traces
├── sdd/                 ← Read-only SDD provider adapters (OpenSpec spike)
├── spec/                ← Spec-driven dev: parse/validate/generate from markdown/YAML/JSON
└── types/               ← Shared type definitions
```

**Flow**: `src/cli/index.ts` sólo crea y ejecuta el programa. `src/cli/create-program.ts` es el composition root de Commander y registra familias de comandos independientes bajo `src/cli/commands/`. Las dependencias compartidas de agentes viven bajo `src/cli/composition/`; `CliContext` inyecta configuración, logger e IO para que los comandos se prueben sin procesos hijos.

`src/core/harness.ts` is a higher-level facade (initialize → createSession → complete → stream) but is **not wired into the CLI** yet.

### `packages/` — Engineering Core and Application
```
packages/
├── shared/              ← Value objects, Result type, identifiers, domain errors, contracts
├── domain/              ← Pure domain: project, intent, work-item, specification, review, release
└── application/         ← Use cases + ports (hexagonal architecture)
```

Shared, Domain and Application are composite TypeScript projects connected with project references. Package-internal imports use relative `.js` extensions; cross-package consumers use `@your-harness/domain` and `@your-harness/application`, never physical `packages/*/src` paths. The root build includes only `src/**` and orchestrates the package graph with `tsc -b`.

## Conventions

- **Package-internal imports use relative paths with `.js` extensions**: `from '../core/config.js'`. Cross-package imports use the package name. Required by `moduleResolution: "NodeNext"`.
- **Path aliases in tsconfig** (`@/*`, `@core/*`, etc.) are declared but **never used**. Do not introduce them.
- **Factory functions in `src/` infrastructure; domain entities and application use cases may be classes**.
- **`import type` for type-only imports**: use `import type { X }` when importing only types.
- **Spanish**: all comments, CLI descriptions, system prompts, and docs are in Spanish.
- **Config paths**: global `~/.your-harness/config.yml`, local `.your-harness/config.yml`. Merged with env vars via dotenv.
- **Documentation is part of done**: update README, AGENTS and affected `docs/` files whenever code, architecture, commands, tests, capabilities or roadmap state changes.

## Known Gaps

- **ToolExecutor** is a stub — logs calls, returns mock results. The CLI agent adapter wires it in `src/cli/commands/register-agent-commands.ts`.
- **MCP client/server** are skeleton JSON-RPC with no real transport.
- **Workflow `command`/`script` steps** are placeholders.
- **`saveConfig`** writes YAML to the configured `.yml` path; provider/runtime configuration remains intentionally minimal.
- **No explicit eslint/prettier config files** — lint/format behavior still needs consolidation.
- **Tests are focused, not broad** — seventy-three tests cover configuration, context, Core smoke flows, runtime composition/boundary, execution environment, read-only OpenSpec projection, SDD drift, operational bindings, governed Change lifecycle, in-process and process-level CLI execution, Evidence/Verification contracts/evaluator, HITM authorization, eligibility and guarded Pi tool integration.
- **No CI/CD** — no `.github/workflows/`.
- **Runtime selection is explicit and project-configured** — `createProjectRuntimeEnvironment` resolves `runtime.defaultRuntime` from `.your-harness/config.yml`, composes `RuntimeRegistry`, `SddProvider`, eligibility policy and execution environment; `fake` remains the safe built-in default and Pi is registered only when resolved.
- **Execution environment enforcement is active at the runtime boundary** — `runtime.executionEnvironment` maps workspace, capabilities, network, secrets and confirmations with deny-by-default values; resolved runtimes reject workspace escape and the guard exposes checks for capabilities, network, secrets and confirmations. Pi enables only the guarded read tool when `workspace.read` is explicitly configured; each path is checked and reads are capped at 256 KiB, while write/process/network/secret tools remain disabled.
- **Operational persistence is implemented** — local JSON repositories persist WorkItems, execution bindings, approved SDD snapshot digests, ExecutionTraces, ChangeStageApprovals, ChangeDraftHandoffs, ChangeMaterializationAudits, ChangeApplyTransitionRecords, GovernedChangeRecords and Pi tool-invocation traces under `.your-harness/state`; the CLI resolves current configured SDD material and denies drift before runtime invocation.
- **OpenSpec reading and guarded draft materialization** — `OpenSpecSddProvider` remains read-only; `OpenSpecMaterializer` may create or replace Changes through HITM approvals, `ExecutionEnvironmentGuard`, atomic staging and digest verification. Existing Change replacement requires the current base digest; task synchronization and `openspec/specs/**` updates remain pending. The digest identifies content, while the your-harness revision is approval metadata because OpenSpec does not persist a native Change version.
- **Execution eligibility has two rules** — Application requires an approved Specification and can require normalized Change provenance; `runtime.requireSddChangeTraceability` configures the second rule at composition time.
- **Verification/Evidence contracts are scoped and durable** — ADR-009 treats RuntimeResult as an observation; VerificationPlan binds one ExecutionTrace and Specification digest, Evidence is filtered to that execution, local JSON repositories persist records, evaluation is conservative/deterministic, and CompletionAuthorization gates `WorkItem.complete()` through `work authorize` with a role-based HITM policy.
- **Application public exports are complete for the current modules** — specification, work-item, review, release, runtime and context APIs are re-exported from the package root.
- **High-level Change CLI facade has started** — `yh change inspect`, `yh change status`, `yh change propose`, `yh change review`, `yh change approve` and scoped `yh change apply` expose the provider projection, durable handoff and staged HITM decisions while hiding internal OpenSpec commands. Propose/review remain non-approving and non-materializing; apply requires the complete HITM chain, explicit confirmation and digest revalidation, then records immutable materialization audit events and Apply transition history. Explicit idempotency/retry keys are supported; status exposure and interrupted-apply recovery remain pending.
- **Change handoff contract has started** — Application exposes immutable `ChangeDraftHandoff` snapshots and `CreateChangeDraftHandoffUseCase`; local persistence stores the complete Proposal/Design/Tasks snapshot and requires explicit chaining through `supersedesHandoffId`. Handoff state is operational and does not replace OpenSpec artifacts.
- **Workspace installation is reproducible with npm** — `package-lock.json` is committed, local package links use `file:`, and `rimraf@^6` is declared at the root and packages; verify with `npm ci` followed by `npm ls`.

## Working in this repo

- New infrastructure features in `src/` should follow the factory-function pattern (`createX()`); preserve the existing DDD class model in `packages/`.
- Keep internal imports as relative `.js` paths and cross-package imports as package names; never add source-path coupling or new aliases.
- `src/core/` defines interfaces; `src/connectors/`, `src/agents/`, etc. provide implementations. Respect this separation.
- Comments and user-facing strings should be in Spanish.
- When touching `packages/`, remember they are a separate concern from `src/` — different architecture (DDD/hexagonal vs. CLI harness).
- Before closing a change, run the relevant build/tests and update every affected document in the same lot.
