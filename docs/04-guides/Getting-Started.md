# Getting Started

## Prerequisites

- Node.js 20 or newer.
- npm.

## Install and verify

```bash
npm install
npm run build
npm test -- --run
npm start -- --help
```

To verify the Engineering Core independently from Pi, and then the Pi adapter separately:

```bash
npm run verify:core
npm run verify:pi
```

The root build uses TypeScript project references to compile Shared, Domain, Application and the CLI/runtime project in dependency order.

Configuration is read from `~/.your-harness/config.yml` and `.your-harness/config.yml`, then merged with environment variables such as `OPENAI_API_KEY`, `CLAUDE_API_KEY` and `COPILOT_API_KEY`.

See [CLI reference](../05-reference/CLI.md) for available commands.
