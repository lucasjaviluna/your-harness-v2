import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLogger } from "../../src/core/logger.js";
import { createCliProgram } from "../../src/cli/create-program.js";
import type { ValidatedConfig } from "../../src/core/config.js";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

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

  it("consulta la auditoría de un WorkItem y aplica el rango temporal", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-audit-cli-"));
    try {
      const store = createLocalOperationalStore({ workspace });
      await store.executionTraces.save({
        id: "trace-audit",
        workItemId: "work-audit",
        specificationId: "spec-1",
        taskReferences: [],
        runtimeId: "fake",
        runtimeResult: { status: "completed", summary: "ok", timestamps: { startedAt: "2026-09-14T10:00:00.000Z", completedAt: "2026-09-14T10:01:00.000Z" } },
        recordedAt: "2026-09-14T10:01:00.000Z",
      });
      const output: unknown[][] = [];
      const { program } = createCliProgram({
        context: {
          config,
          logger: createLogger("fatal"),
          io: { write: (...values) => output.push([...values]), setExitCode: () => undefined },
        },
      });

      await program.parseAsync(["node", "yh", "audit", "work-item", "work-audit", "--workspace", workspace, "--from", "2026-09-14T10:00:00.000Z", "--to", "2026-09-14T11:00:00.000Z", "--json"]);

      const record = JSON.parse(String(output.flat()[0]));
      expect(record.workItemId).toBe("work-audit");
      expect(record.executions).toHaveLength(1);
      expect(record.executions[0].executionTrace.id).toBe("trace-audit");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
