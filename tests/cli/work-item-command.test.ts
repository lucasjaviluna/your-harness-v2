import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WorkItemId } from "@your-harness/domain";
import { createCliProgram } from "../../src/cli/create-program.js";
import { createLocalOperationalStore } from "../../src/persistence/index.js";
import { createLogger } from "../../src/core/logger.js";
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

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("work command registration", () => {
  it("executes against injected IO without a child process", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-cli-work-command-"));
    workspaces.push(workspace);
    const output: unknown[][] = [];
    const { program } = createCliProgram({
      context: {
        config,
        logger: createLogger("fatal"),
        io: {
          write: (...values) => output.push(values),
          setExitCode: () => undefined,
        },
      },
    });

    await program.parseAsync([
      "node",
      "yh",
      "work",
      "create",
      "direct-work",
      "--title",
      "Direct command test",
      "--workspace",
      workspace,
    ]);

    await expect(
      createLocalOperationalStore({ workspace }).workItems.findById(new WorkItemId("direct-work")),
    ).resolves.toMatchObject({ title: { value: "Direct command test" } });
    expect(output.flat().join(" ")).toContain("Work item 'direct-work' persisted");
  });
});
