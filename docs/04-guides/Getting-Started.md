# Getting Started

## Prerequisites

- Node.js 20 or newer.
- npm.

## Install and verify

```bash
npm ci
npm run build
npm test -- --run
npm start -- --help
```

`package-lock.json` is the installation source of truth. Use `npm install` only when intentionally changing dependencies; commit the resulting lockfile. The root and package projects share `rimraf@^6` for clean scripts, while older transitive tooling versions remain isolated under their own dependency tree.

To verify the Engineering Core independently from Pi, and then the Pi adapter separately:

```bash
npm run verify:core
npm run verify:pi
```

The root build uses TypeScript project references to compile Shared, Domain, Application and the CLI/runtime project in dependency order.

Configuration is read from `~/.your-harness/config.yml` and `.your-harness/config.yml`, then merged with environment variables such as `OPENAI_API_KEY`, `CLAUDE_API_KEY` and `COPILOT_API_KEY`.

The local YAML config can select the default runtime, the read-only SDD provider, SDD traceability and the execution-environment policy. See [project configuration](../05-reference/Project-Configuration.md). These policy declarations do not enable Pi tools yet.

See [CLI reference](../05-reference/CLI.md) for available commands.
