# AGENTS.md

## Project

`your-harness` (`yh`) — CLI-first AI dev harness. TypeScript, Node 20+, Commander.js, Zod, pino.
Early prototype (Stage 1). Core interfaces exist; many critical paths return mock/stub data.

## Setup

```bash
npm install          # required — no lockfile or node_modules exist yet
cp .env.example .env # API keys for providers (COPILOT_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY, OLLAMA_HOST)
```

## Commands

```bash
npm run dev          # tsx watch src/cli/index.ts
npm run build        # tsc → dist/
npm run start        # node dist/cli/index.js
npm run test         # vitest — see Known Gaps
npm run lint         # eslint src/ — see Known Gaps
npm run format       # prettier --write src/ — see Known Gaps
```

## Architecture

Two separate codebases coexist:

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
├── spec/                ← Spec-driven dev: parse/validate/generate from markdown/YAML/JSON
└── types/               ← Shared type definitions
```

**Flow**: `src/cli/index.ts` creates all managers at module top level, registers builtins, then delegates to Commander commands.

`src/core/harness.ts` is a higher-level facade (initialize → createSession → complete → stream) but is **not wired into the CLI** yet.

### `packages/` — DDD domain model (separate concern)
```
packages/
├── shared/              ← Value objects, Result type, identifiers, domain errors, contracts
├── domain/              ← Pure domain: project, intent, work-item, specification, review, release
└── application/         ← Use cases + ports (hexagonal architecture)
```

These packages use relative `.js` extension imports internally. `packages/application` imports from `@your-harness/domain` — verify this resolves before assuming packages work together.

## Conventions

- **All imports use relative paths with `.js` extensions**: `from '../core/config.js'`. Required by `moduleResolution: "NodeNext"`.
- **Path aliases in tsconfig** (`@/*`, `@core/*`, etc.) are declared but **never used**. Do not introduce them.
- **Factory functions over classes**: every module exports `createX()` factories with closure state.
- **`import type` for type-only imports**: use `import type { X }` when importing only types.
- **Spanish**: all comments, CLI descriptions, system prompts, and docs are in Spanish.
- **Config paths**: global `~/.your-harness/config.yml`, local `.your-harness/config.yml`. Merged with env vars via dotenv.

## Known Gaps

- **ToolExecutor** is a stub — logs calls, returns mock results. Wired in `src/cli/index.ts:393`.
- **MCP client/server** are skeleton JSON-RPC with no real transport.
- **Workflow `command`/`script` steps** are placeholders.
- **`saveConfig`** writes JSON to a `.yml` path (extension bug in `src/core/config.ts:120`).
- **No vitest/eslint/prettier config files** — `npm run test`, `lint`, `format` will fail or use defaults.
- **No test files** exist anywhere in the repo.
- **No CI/CD** — no `.github/workflows/`.
- **`packages/application`** depends on `@your-harness/domain` — confirm resolution before modifying.
- **Packages use `workspace:*`** but no workspace config (`pnpm-workspace.yaml`, etc.) exists — inter-package resolution may not work.

## Working in this repo

- New features should follow the factory-function pattern (`createX()`).
- Keep imports as relative `.js` extension paths — never add path aliases.
- `src/core/` defines interfaces; `src/connectors/`, `src/agents/`, etc. provide implementations. Respect this separation.
- Comments and user-facing strings should be in Spanish.
- When touching `packages/`, remember they are a separate concern from `src/` — different architecture (DDD/hexagonal vs. CLI harness).
