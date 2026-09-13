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
├── cli/index.ts         ← CLI entrypoint (yh binary), wires everything manually
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
├── sdd/                 ← Read-only SDD provider adapters (OpenSpec spike)
├── spec/                ← Spec-driven dev: parse/validate/generate from markdown/YAML/JSON
└── types/               ← Shared type definitions
```

**Flow**: `src/cli/index.ts` creates all managers at module top level, registers builtins, then delegates to Commander commands.

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

- **ToolExecutor** is a stub — logs calls, returns mock results. Wired in `src/cli/index.ts:393`.
- **MCP client/server** are skeleton JSON-RPC with no real transport.
- **Workflow `command`/`script` steps** are placeholders.
- **`saveConfig`** writes JSON to a `.yml` path (extension bug in `src/core/config.ts:120`).
- **No explicit eslint/prettier config files** — lint/format behavior still needs consolidation.
- **Tests are focused, not broad** — seventeen tests cover context, Core smoke flows, runtime composition/boundary, execution environment, read-only OpenSpec projection and Pi adapter integration.
- **No CI/CD** — no `.github/workflows/`.
- **Runtime selection is explicit and configurable at composition time** — `RuntimeRegistry` registers available adapters, `fake` is the safe default, and Pi is registered only when selected; project-level configuration and capability negotiation are pending.
- **Execution environment contract is defined but not enforced by tools** — `ExecutionEnvironment` models workspace, capabilities, network, secrets and confirmations with deny-by-default values; Pi remains `noTools: "all"`.
- **Operational persistence is pending** — the CLI uses demonstration aggregates and in-memory repositories.
- **OpenSpec is read-only only** — `OpenSpecSddProvider` projects local artifacts through `SddProvider`; provider selection, writes, task synchronization and Change lifecycle are pending.
- **Application public exports are complete for the current modules** — specification, work-item, review, release, runtime and context APIs are re-exported from the package root.
- **Workspace installation is reproducible with npm** — `package-lock.json` is committed, local package links use `file:`, and `rimraf@^6` is declared at the root and packages; verify with `npm ci` followed by `npm ls`.

## Working in this repo

- New infrastructure features in `src/` should follow the factory-function pattern (`createX()`); preserve the existing DDD class model in `packages/`.
- Keep internal imports as relative `.js` paths and cross-package imports as package names; never add source-path coupling or new aliases.
- `src/core/` defines interfaces; `src/connectors/`, `src/agents/`, etc. provide implementations. Respect this separation.
- Comments and user-facing strings should be in Spanish.
- When touching `packages/`, remember they are a separate concern from `src/` — different architecture (DDD/hexagonal vs. CLI harness).
- Before closing a change, run the relevant build/tests and update every affected document in the same lot.
