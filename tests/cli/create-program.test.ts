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
        "change",
      ]),
    );

    await program.parseAsync(["node", "yh", "mode"]);
    expect(output.flat().join(" ")).toContain("Current mode: custom");
  });

  it("expone inspect y status como fachada read-only de un Change", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-change-cli-"));
    try {
      await (await import("node:fs/promises")).mkdir(path.join(workspace, "openspec/changes/add-mfa"), { recursive: true });
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/proposal.md"), "# Add MFA\n\n## Why\nProtect accounts.\n", "utf8");
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/design.md"), "# Design\n", "utf8");
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/tasks.md"), "- [ ] Implement\n", "utf8");
      const output: unknown[][] = [];
      const { program } = createCliProgram({
        context: {
          config,
          logger: createLogger("fatal"),
          io: { write: (...values) => output.push([...values]), setExitCode: () => undefined },
        },
      });

      await program.parseAsync(["node", "yh", "change", "inspect", "add-mfa", "--workspace", workspace, "--json"]);
      const inspected = JSON.parse(String(output.flat()[0]));
      expect(inspected.change.id).toBe("add-mfa");
      expect(inspected.change.provenance.providerId).toBe("openspec");

      output.length = 0;
      await program.parseAsync(["node", "yh", "change", "status", "add-mfa", "--workspace", workspace, "--json"]);
      const status = JSON.parse(String(output.flat()[0]));
      expect(status.change.contentDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(status.lifecycle).toBeUndefined();
      expect(status.invalidatedApprovals).toEqual([]);
      expect(status.applyTransitions).toEqual([]);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("crea y revisa un handoff sin escribir sobre OpenSpec", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-change-handoff-cli-"));
    const proposalFile = path.join(workspace, "proposal.md");
    const designFile = path.join(workspace, "design.md");
    const tasksFile = path.join(workspace, "tasks.md");
    try {
      const { mkdir, writeFile, readFile } = await import("node:fs/promises");
      await mkdir(path.join(workspace, "openspec/changes/add-mfa"), { recursive: true });
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/proposal.md"), "# Old proposal", "utf8");
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/design.md"), "# Old design", "utf8");
      await writeFile(path.join(workspace, "openspec/changes/add-mfa/tasks.md"), "- [ ] Old task", "utf8");
      await writeFile(proposalFile, "# New proposal", "utf8");
      await writeFile(designFile, "# New design", "utf8");
      await writeFile(tasksFile, "- [ ] New task", "utf8");
      const output: unknown[][] = [];
      const { program } = createCliProgram({
        context: {
          config,
          logger: createLogger("fatal"),
          io: { write: (...values) => output.push([...values]), setExitCode: () => undefined },
        },
      });

      await program.parseAsync(["node", "yh", "change", "propose", "add-mfa", "--workspace", workspace,
        "--proposal-file", proposalFile, "--design-file", designFile, "--tasks-file", tasksFile,
        "--by", "user@example.com", "--role", "reviewer", "--json"]);
      const handoff = JSON.parse(String(output.flat()[0]));
      expect(handoff.status).toBe("ready-for-review");
      expect(handoff.proposal).toBe("# New proposal");
      expect(handoff.origin).toBe("user");
      await expect(readFile(path.join(workspace, "openspec/changes/add-mfa/proposal.md"), "utf8"))
        .resolves.toBe("# Old proposal");

      output.length = 0;
      await program.parseAsync(["node", "yh", "change", "review", "add-mfa", "--workspace", workspace, "--json"]);
      expect(JSON.parse(String(output.flat()[0]))).toMatchObject({ id: handoff.id, design: "# New design" });

      output.length = 0;
      await program.parseAsync(["node", "yh", "change", "approve", "add-mfa", "--stage", "proposal",
        "--decision", "approve", "--by", "architect@example.com", "--role", "reviewer",
        "--reason", "Proposal revisado", "--workspace", workspace, "--json"]);
      expect(JSON.parse(String(output.flat()[0]))).toMatchObject({
        changeId: "add-mfa", stage: "proposal", decision: "approve", changeDigest: handoff.proposedContentDigest,
      });

      output.length = 0;
      await program.parseAsync(["node", "yh", "change", "approve", "add-mfa", "--stage", "design",
        "--decision", "approve", "--by", "architect@example.com", "--role", "reviewer",
        "--reason", "Design revisado", "--workspace", workspace, "--json"]);
      expect(JSON.parse(String(output.flat()[0]))).toMatchObject({ stage: "design", decision: "approve" });

      for (const [stage, reason] of [["task-plan", "Tasks revisadas"], ["apply-readiness", "Apply autorizado"]] as const) {
        await program.parseAsync(["node", "yh", "change", "approve", "add-mfa", "--stage", stage,
          "--decision", "approve", "--by", "architect@example.com", "--role", "reviewer",
          "--reason", reason, "--workspace", workspace, "--json"]);
      }
      const applyConfig: ValidatedConfig = {
        ...config,
        runtime: {
          ...config.runtime,
          executionEnvironment: {
            ...config.runtime.executionEnvironment,
            workspace: { mode: "read-write" },
            capabilities: ["workspace.write"],
          },
        },
      };
      const applyOutput: unknown[][] = [];
      const { program: applyProgram } = createCliProgram({
        context: {
          config: applyConfig,
          logger: createLogger("fatal"),
          io: { write: (...values) => applyOutput.push([...values]), setExitCode: () => undefined },
        },
      });
      await applyProgram.parseAsync(["node", "yh", "change", "apply", "add-mfa", "--confirm", "--by", "architect@example.com", "--role", "maintainer", "--workspace", workspace, "--json"]);
      expect(JSON.parse(String(applyOutput.flat()[0]))).toMatchObject({ result: { changeId: "add-mfa" } });
      await expect(readFile(path.join(workspace, "openspec/changes/add-mfa/proposal.md"), "utf8"))
        .resolves.toBe("# New proposal");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
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
