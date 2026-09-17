import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalOperationalStore } from "../../src/persistence/index.js";
import { TransitionChangeApplyUseCase } from "@your-harness/application";

const executeFile = promisify(execFile);
const cli = path.resolve("dist/src/cli/index.js");
const workspaces: string[] = [];

const runYh = async (workspace: string, ...arguments_: string[]) =>
  executeFile(process.execPath, [cli, ...arguments_], { cwd: workspace });

const runYhWithMaterializationCollision = async (workspace: string, ...arguments_: string[]) => {
  const script = `
    import { writeFileSync } from "node:fs";
    import path from "node:path";
    const workspace = process.env.YH_TEST_WORKSPACE;
    writeFileSync(path.join(workspace, "openspec", "changes", ".yh-materialize-add-login-" + process.pid), "collision");
    process.argv = ["node", "yh", ...JSON.parse(process.env.YH_TEST_ARGS)];
    await import(${JSON.stringify(pathToFileURL(cli).href)});
  `;
  return executeFile(process.execPath, ["--input-type=module", "-e", script], {
    cwd: workspace,
    env: { ...process.env, YH_TEST_WORKSPACE: workspace, YH_TEST_ARGS: JSON.stringify(arguments_) },
  });
};

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

const prepareApprovedHandoff = async (workspace: string) => {
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
  const handoff = JSON.parse(proposed.stdout) as {
    id: string; proposedVersion: string; proposedContentDigest: string; baseContentDigest?: string; provenance: object;
  };
  await approveAllStages(workspace);
  return { handoff };
};

const prepareInterruptedApply = async (workspace: string) => {
  const { handoff } = await prepareApprovedHandoff(workspace);
  const store = createLocalOperationalStore({ workspace });
  const transition = new TransitionChangeApplyUseCase(store.changeApplyTransitions);
  const transitionBase = {
    changeId: "add-login", handoffId: handoff.id, attemptId: "interrupted-alternative-attempt",
    idempotencyKey: "interrupted-alternative-apply", changeVersion: handoff.proposedVersion,
    changeDigest: handoff.proposedContentDigest, provenance: handoff.provenance,
    changedBy: "architect@example.com", changedByRole: "maintainer" as const,
  };
  for (const [index, status] of ["approved", "apply-ready", "applying"].entries()) {
    await transition.execute({
      ...transitionBase, id: `interrupted-alternative-transition-${index}`,
      requestedStatus: status as "approved" | "apply-ready" | "applying",
      reason: `Estado recuperado: ${status}`, changedAt: `2026-09-15T06:00:0${index}.000Z`,
    });
  }
  return { handoff, store };
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

  it("persiste un fallo real de escritura del materializer", async () => {
    const workspace = await createWorkspace(true);
    const { handoff } = await prepareApprovedHandoff(workspace);
    const failed = await runYhWithMaterializationCollision(
      workspace, "change", "apply", "add-login", "--workspace", workspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "apply-write-failure-process", "--json",
    ).catch((error: unknown) => error as { stdout: string; code: number });

    expect(failed.code).toBe(1);
    if (!failed.stdout) throw new Error("El wrapper de colisión no produjo JSON: " + (failed as { stderr?: string }).stderr);
    expect(JSON.parse(failed.stdout)).toMatchObject({
      ok: false, error: { code: "CHANGE_APPLY_FAILED", exitCode: 1 },
    });
    await expect(readFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "utf8"))
      .resolves.toBe("# Existing proposal\n");

    const store = createLocalOperationalStore({ workspace });
    const audit = await store.changeMaterializationAudits.findByIdempotencyKey("apply-write-failure-process");
    expect(audit).toMatchObject({
      handoffId: handoff.id, outcome: "failed", idempotencyKey: "apply-write-failure-process",
    });
    expect(audit?.error).toContain("already exists");
    const failedAttempt = await store.changeApplyTransitions.findCurrentByChangeId("add-login");
    expect(failedAttempt).toMatchObject({ toStatus: "apply-failed" });

    const changeEntries = await readdir(path.join(workspace, "openspec/changes"));
    await Promise.all(changeEntries
      .filter((entry) => entry.startsWith(".yh-materialize-add-login-"))
      .map((entry) => rm(path.join(workspace, "openspec/changes", entry), { recursive: true, force: true })));

  }, 60_000);

  it("observa y resuelve un Apply interrumpido con HITM e idempotencia", async () => {
    const workspace = await createWorkspace(false);
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
    await approveAllStages(workspace);

    const store = createLocalOperationalStore({ workspace });
    const transition = new TransitionChangeApplyUseCase(store.changeApplyTransitions);
    const transitionBase = {
      changeId: "add-login",
      handoffId: handoff.id,
      attemptId: "interrupted-process-attempt",
      idempotencyKey: "interrupted-process-apply",
      changeVersion: handoff.proposedVersion,
      changeDigest: handoff.proposedContentDigest,
      provenance: handoff.provenance,
      changedBy: "architect@example.com",
      changedByRole: "maintainer" as const,
    };
    for (const [index, status] of ["approved", "apply-ready", "applying"].entries()) {
      await transition.execute({
        ...transitionBase,
        id: `interrupted-process-transition-${index}`,
        requestedStatus: status as "approved" | "apply-ready" | "applying",
        reason: `Estado recuperado: ${status}`,
        changedAt: `2026-09-15T05:00:0${index}.000Z`,
      });
    }

    const observation = await runYh(workspace, "change", "recover", "add-login", "--workspace", workspace, "--json");
    expect(JSON.parse(observation.stdout)).toMatchObject({
      observation: "not-materialized",
      recommendedStatus: "apply-failed",
      persisted: false,
    });
    await expect(store.changeApplyTransitions.findCurrentByChangeId("add-login"))
      .resolves.toMatchObject({ toStatus: "applying" });

    const resolution = await runYh(
      workspace, "change", "recover", "add-login", "--workspace", workspace,
      "--confirm", "--decision", "apply-failed", "--by", "architect@example.com",
      "--role", "maintainer", "--reason", "El provider conserva el snapshot base.",
      "--idempotency-key", "recovery-process-1", "--json",
    );
    expect(JSON.parse(resolution.stdout)).toMatchObject({
      persisted: true,
      resolution: { audit: { outcome: "failed" }, transition: { toStatus: "apply-failed" } },
    });

    const replay = await runYh(
      workspace, "change", "recover", "add-login", "--workspace", workspace,
      "--idempotency-key", "recovery-process-1", "--json",
    );
    expect(JSON.parse(replay.stdout)).toMatchObject({ idempotentReplay: true, audit: { outcome: "failed" } });
    await expect(store.changeMaterializationAudits.findByIdempotencyKey("recovery-process-1"))
      .resolves.toMatchObject({ outcome: "failed" });
  }, 60_000);

  it("reconoce como materializado un provider que ya tiene el digest esperado", async () => {
    const workspace = await createWorkspace(false);
    const { handoff, store } = await prepareInterruptedApply(workspace);
    await writeFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "# Add login\n");
    await writeFile(path.join(workspace, "openspec/changes/add-login/design.md"), "# Login design\n");
    await writeFile(path.join(workspace, "openspec/changes/add-login/tasks.md"), "- [ ] Implement login\n");

    const recovery = await runYh(
      workspace, "change", "recover", "add-login", "--workspace", workspace,
      "--confirm", "--decision", "materialized", "--by", "architect@example.com",
      "--role", "maintainer", "--reason", "El provider ya contiene el digest esperado.",
      "--idempotency-key", "recovery-materialized-process", "--json",
    );
    expect(JSON.parse(recovery.stdout)).toMatchObject({
      persisted: true,
      observation: "already-materialized",
      recommendedStatus: "materialized",
      resolution: { audit: { outcome: "succeeded" }, transition: { toStatus: "materialized" } },
    });
    await expect(store.changeApplyTransitions.findCurrentByChangeId("add-login"))
      .resolves.toMatchObject({ toStatus: "materialized" });
  }, 60_000);

  it("no autoriza automáticamente un provider divergente y exige recovery adicional", async () => {
    const workspace = await createWorkspace(false);
    const { store } = await prepareInterruptedApply(workspace);
    await writeFile(path.join(workspace, "openspec/changes/add-login/proposal.md"), "# Divergent content\n");

    const observation = await runYh(workspace, "change", "recover", "add-login", "--workspace", workspace, "--json");
    expect(JSON.parse(observation.stdout)).toMatchObject({
      persisted: false,
      observation: "inconsistent",
      recommendedStatus: "recovery-required",
    });
    const attemptedResolution = await runYh(
      workspace, "change", "recover", "add-login", "--workspace", workspace,
      "--confirm", "--decision", "materialized", "--by", "architect@example.com",
      "--role", "maintainer", "--reason", "Intento no permitido por divergencia.",
      "--idempotency-key", "recovery-inconsistent-process", "--json",
    ).catch((error: unknown) => error as { stdout: string; code: number });
    expect(attemptedResolution.code).toBe(3);
    expect(JSON.parse(attemptedResolution.stdout)).toMatchObject({
      ok: false, error: { code: "CHANGE_RECOVERY_HITM_REQUIRED", exitCode: 3 },
    });
    await expect(store.changeApplyTransitions.findCurrentByChangeId("add-login"))
      .resolves.toMatchObject({ toStatus: "applying" });
  }, 60_000);

  it("requiere una clave nueva y el intento anterior para reintentar un Apply fallido", async () => {
    const workspace = await createWorkspace(true);
    const { handoff } = await prepareApprovedHandoff(workspace);
    const changeRoot = path.join(workspace, "openspec/changes/add-login");
    await writeFile(path.join(changeRoot, "proposal.md"), "# Unexpected provider edit\n");

    const failed = await runYh(
      workspace, "change", "apply", "add-login", "--workspace", workspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "apply-failed-process", "--json",
    ).catch((error: unknown) => error as { stdout: string; code: number });
    expect(failed.code).toBe(1);
    expect(JSON.parse(failed.stdout)).toMatchObject({ ok: false, error: { code: "CHANGE_APPLY_FAILED", exitCode: 1 } });

    const store = createLocalOperationalStore({ workspace });
    const failedAudit = await store.changeMaterializationAudits.findByIdempotencyKey("apply-failed-process");
    const failedAttempt = await store.changeApplyTransitions.findCurrentByChangeId("add-login");
    expect(failedAudit).toMatchObject({ outcome: "failed" });
    expect(failedAttempt).toMatchObject({ toStatus: "apply-failed" });
    expect(failedAttempt?.attemptId).toBeDefined();

    await writeFile(path.join(changeRoot, "proposal.md"), "# Existing proposal\n");
    const retried = await runYh(
      workspace, "change", "apply", "add-login", "--workspace", workspace,
      "--confirm", "--by", "architect@example.com", "--role", "maintainer",
      "--idempotency-key", "apply-retry-process", "--retry-of", failedAttempt!.attemptId, "--json",
    );
    const retryPayload = JSON.parse(retried.stdout);
    expect(retryPayload).toMatchObject({ result: { changeId: "add-login" }, audit: { outcome: "succeeded", retryOfAttemptId: failedAttempt!.attemptId } });
    expect(retryPayload.audit.idempotencyKey).toBe("apply-retry-process");
    expect(retryPayload.audit.idempotencyKey).not.toBe(failedAudit?.idempotencyKey);
    await expect(store.changeApplyTransitions.findCurrentByChangeId("add-login"))
      .resolves.toMatchObject({ toStatus: "materialized", attemptId: retryPayload.audit.attemptId });
  }, 60_000);
});
