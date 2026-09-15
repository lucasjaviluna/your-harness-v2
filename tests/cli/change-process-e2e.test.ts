import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

const executeFile = promisify(execFile);
const cli = path.resolve("dist/src/cli/index.js");
const workspaces: string[] = [];

const runYh = async (workspace: string, ...arguments_: string[]) =>
  executeFile(process.execPath, [cli, ...arguments_], { cwd: workspace });

const createWorkspace = async (withWriteCapability: boolean): Promise<string> => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-change-process-e2e-"));
  workspaces.push(workspace);
  await mkdir(path.join(workspace, "openspec/changes/add-login"), { recursive: true });
  await writeFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "# Existing proposal\n");
  await writeFile(path.join(workspace, "openspec/changes/add-login/design.md"), "# Existing design\n");
  await writeFile(path.join(workspace, "openspec/changes/add-login/tasks.md"), "- [ ] Existing task\n");
  await mkdir(path.join(workspace, ".your-harness"), { recursive: true });
  await writeFile(
    path.join(workspace, ".your-harness/config.yml"),
    withWriteCapability
      ? "runtime:\n  executionEnvironment:\n    workspace:\n      mode: read-write\n    capabilities: [workspace.write]\n"
      : "runtime:\n  executionEnvironment:\n    workspace:\n      mode: read-only\n    capabilities: []\n",
  );
  return workspace;
};

const approveAllStages = async (workspace: string) => {
  for (const stage of ["proposal", "design", "task-plan", "apply-readiness"]) {
    await runYh(
      workspace,
      "change", "approve", "add-login", "--stage", stage, "--decision", "approve",
      "--by", "architect@example.com", "--role", "reviewer", "--reason", `Aprobado: ${stage}`,
    );
  }
};

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("yh change como proceso", () => {
  it("ejecuta el flujo gobernado, materializa y reproduce un Apply idempotente", async () => {
    const workspace = await createWorkspace(true);
    const proposal = path.join(workspace, "proposal.md");
    const design = path.join(workspace, "design.md");
    const tasks = path.join(workspace, "tasks.md");
    await writeFile(proposal, "# Add login\n");
    await writeFile(design, "# Login design\n");
    await writeFile(tasks, "- [ ] Implement login\n");

    const proposed = await runYh(
      workspace, "change", "propose", "add-login", "--workspace", workspace,
      "--proposal-file", proposal, "--design-file", design, "--tasks-file", tasks,
      "--by", "user@example.com", "--role", "reviewer", "--json",
    );
    const handoff = JSON.parse(proposed.stdout);
    expect(handoff.status).toBe("ready-for-review");

    await approveAllStages(workspace);
    const applied = await runYh(
      workspace, "change", "apply", "add-login", "--workspace", workspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "apply-process-1", "--json",
    );
    const appliedPayload = JSON.parse(applied.stdout);
    expect(appliedPayload.result).toMatchObject({ changeId: "add-login", contentDigest: handoff.proposedContentDigest });
    expect(appliedPayload.audit).toMatchObject({ outcome: "succeeded", idempotencyKey: "apply-process-1" });
    await expect(readFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "utf8"))
      .resolves.toBe("# Add login\n");

    const replay = await runYh(
      workspace, "change", "apply", "add-login", "--workspace", workspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "apply-process-1", "--json",
    );
    expect(JSON.parse(replay.stdout)).toMatchObject({ handoffId: handoff.id, idempotentReplay: true });

    const state = createLocalOperationalStore({ workspace });
    await expect(state.changeMaterializationAudits.findByIdempotencyKey("apply-process-1"))
      .resolves.toMatchObject({ outcome: "succeeded" });
    await expect(readdir(path.join(workspace, ".your-harness/state/change-materialization-audits")))
      .resolves.toHaveLength(1);
  }, 60_000);

  it("rechaza Apply por capability de escritura ausente y devuelve contrato JSON estable", async () => {
    const workspace = await createWorkspace(false);
    const proposal = path.join(workspace, "proposal.md");
    const design = path.join(workspace, "design.md");
    const tasks = path.join(workspace, "tasks.md");
    await writeFile(proposal, "# Add login\n");
    await writeFile(design, "# Login design\n");
    await writeFile(tasks, "- [ ] Implement login\n");
    await runYh(workspace, "change", "propose", "add-login", "--workspace", workspace, "--proposal-file", proposal, "--design-file", design, "--tasks-file", tasks, "--by", "user@example.com", "--role", "reviewer");
    await approveAllStages(workspace);

    const result = await runYh(workspace, "change", "apply", "add-login", "--workspace", workspace, "--confirm", "--by", "architect@example.com", "--role", "maintainer", "--idempotency-key", "apply-no-write", "--json").catch((error: unknown) => error as { stdout: string; code: number });
    expect(result.code).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, error: { code: "CHANGE_APPLY_GUARDRAIL", exitCode: 3 } });
    await expect(readFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "utf8"))
      .resolves.toBe("# Existing proposal\n");
    const state = createLocalOperationalStore({ workspace });
    await expect(state.changeMaterializationAudits.findByIdempotencyKey("apply-no-write"))
      .resolves.toMatchObject({ outcome: "failed" });
    await expect(state.changeApplyTransitions.findCurrentByChangeId("add-login"))
      .resolves.toMatchObject({ toStatus: "apply-failed" });
  }, 60_000);
});
