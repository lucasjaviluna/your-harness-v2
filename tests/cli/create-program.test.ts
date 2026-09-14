import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/core/logger.js";
import { createCliProgram } from "../../src/cli/create-program.js";
import type { ValidatedConfig } from "../../src/core/config.js";

const config: ValidatedConfig = {
  version: "test-version",
  defaultProvider: "claude",
  logLevel: "fatal",
  mode: "custom",
  providers: {
    copilot: { enabled: false },
    claude: { enabled: false },
    openai: { enabled: false },
    local: { enabled: false },
    custom: { enabled: false },
  },
  runtime: {
    defaultRuntime: "fake",
    sddProvider: "openspec",
    requireSddChangeTraceability: false,
    executionEnvironment: {
      workspace: {},
      capabilities: [],
      network: {},
      secrets: {},
      confirmations: {},
    },
  },
};

describe("createCliProgram", () => {
  it("creates the root program from injected dependencies", async () => {
    const output: unknown[][] = [];
    const { program } = createCliProgram({
      context: {
        config,
        logger: createLogger("fatal"),
        io: {
          write: (...values) => output.push([...values]),
          setExitCode: () => undefined,
        },
      },
    });

    expect(program.name()).toBe("yh");
    expect(program.version()).toBe("test-version");
    expect(program.commands.map((command) => command.name())).toEqual(
      expect.arrayContaining([
        "version",
        "config",
        "mode",
        "provider",
        "agent",
        "plugin",
        "skill",
        "mcp",
        "workflow",
        "spec",
        "work-item",
        "evidence",
        "verification",
        "audit",
      ]),
    );

    await program.parseAsync(["node", "yh", "mode"]);
    expect(output.flat().join(" ")).toContain("Current mode: custom");
  });
});
