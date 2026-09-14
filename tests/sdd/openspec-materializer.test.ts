import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ApproveChangeStageUseCase,
  createChangeStageApproval,
  MaterializeApprovedChangeUseCase,
} from "@your-harness/application";
import { createExecutionEnvironment, createExecutionEnvironmentGuard } from "../../src/runtime/index.js";
import {
  createOpenSpecCommandGenerationStrategy,
  OpenSpecMaterializer,
  type OpenSpecGenerationStrategy,
} from "../../src/sdd/openspec/index.js";
import { OpenSpecSddProvider } from "../../src/sdd/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("OpenSpecMaterializer", () => {
  it("permite reemplazar el mecanismo de generación sin mover los guardrails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yh-materializer-"));
    roots.push(root);
    const environment = createExecutionEnvironment({
      workspace: { root, mode: "read-write" },
      capabilities: ["workspace.write"],
    });
    const calls: string[] = [];
    const generationStrategy: OpenSpecGenerationStrategy = {
      async generate(preview, targetRoot) {
        calls.push(`${preview.changeId}:${targetRoot}`);
        const { writeFile } = await import("node:fs/promises");
        await writeFile(path.join(targetRoot, "proposal.md"), preview.proposal, "utf8");
        await writeFile(path.join(targetRoot, "design.md"), preview.design, "utf8");
        await writeFile(path.join(targetRoot, "tasks.md"), preview.tasks, "utf8");
      },
    };
    const materializer = new OpenSpecMaterializer({
      guard: createExecutionEnvironmentGuard(environment),
      confirmed: true,
      generationStrategy,
    });
    const preview = await materializer.previewDraftChange({
      scope: { root }, changeId: "add-mfa", proposal: "# Proposal", design: "# Design", tasks: "- [ ] Task",
    });
    const approvals = ["proposal", "design", "task-plan", "apply-readiness"].map((stage, index) =>
      createChangeStageApproval({
        id: `strategy-approval-${stage}`,
        changeId: preview.changeId,
        stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness",
        changeVersion: preview.version,
        changeDigest: preview.contentDigest,
        decision: "approve",
        approvedBy: "architect@example.com",
        approvedByRole: "reviewer",
        reason: `Approved ${stage}.`,
        approvedAt: `2026-09-14T20:0${index}:00.000Z`,
      }),
    );

    await new MaterializeApprovedChangeUseCase(materializer).execute(preview, approvals);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("add-mfa:");
  });

  it("puede adaptar un runner externo sin ejecutar procesos por sí mismo", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yh-materializer-"));
    roots.push(root);
    const environment = createExecutionEnvironment({
      workspace: { root, mode: "read-write" },
      capabilities: ["workspace.write"],
    });
    let invocation: { changeId: string; instruction: string; targetRoot: string } | undefined;
    const strategy = createOpenSpecCommandGenerationStrategy({
      async execute(request) {
        invocation = request;
        const { writeFile } = await import("node:fs/promises");
        await writeFile(path.join(request.targetRoot, "proposal.md"), "# Proposal", "utf8");
        await writeFile(path.join(request.targetRoot, "design.md"), "# Design", "utf8");
        await writeFile(path.join(request.targetRoot, "tasks.md"), "- [ ] Task", "utf8");
        return { exitCode: 0 };
      },
    });
    const materializer = new OpenSpecMaterializer({
      guard: createExecutionEnvironmentGuard(environment), confirmed: true, generationStrategy: strategy,
    });
    const preview = await materializer.previewDraftChange({
      scope: { root }, changeId: "add-mfa", proposal: "# Proposal", design: "# Design", tasks: "- [ ] Task",
    });
    const approvals = ["proposal", "design", "task-plan", "apply-readiness"].map((stage, index) =>
      createChangeStageApproval({
        id: `runner-approval-${stage}`,
        changeId: preview.changeId,
        stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness",
        changeVersion: preview.version,
        changeDigest: preview.contentDigest,
        decision: "approve",
        approvedBy: "architect@example.com",
        approvedByRole: "reviewer",
        reason: `Approved ${stage}.`,
        approvedAt: `2026-09-14T21:0${index}:00.000Z`,
      }),
    );

    await new MaterializeApprovedChangeUseCase(materializer).execute(preview, approvals);
    expect(invocation).toMatchObject({ changeId: "add-mfa", instruction: "/opsx:propose add-mfa" });
  });

  it("materializa un Change nuevo sólo después de Apply Readiness aprobado", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yh-materializer-"));
    roots.push(root);
    const environment = createExecutionEnvironment({
      workspace: { root, mode: "read-write" },
      capabilities: ["workspace.write"],
    });
    const materializer = new OpenSpecMaterializer({
      guard: createExecutionEnvironmentGuard(environment),
      confirmed: true,
    });
    const preview = await materializer.previewDraftChange({
      scope: { root },
      changeId: "add-mfa",
      proposal: "# Add MFA\n\n## Why\nProtect accounts.\n",
      design: "# Design\n",
      tasks: "- [ ] Add challenge\n",
    });
    const approvals = ["proposal", "design", "task-plan", "apply-readiness"].map((stage, index) =>
      createChangeStageApproval({
        id: `approval-${stage}`,
        changeId: preview.changeId,
        stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness",
        changeVersion: preview.version,
        changeDigest: preview.contentDigest,
        decision: "approve",
        approvedBy: "architect@example.com",
        approvedByRole: "reviewer",
        reason: `Approved ${stage}.`,
        approvedAt: `2026-09-14T19:0${index}:00.000Z`,
      }),
    );

    const result = await new MaterializeApprovedChangeUseCase(materializer).execute(preview, approvals);
    expect(result.contentDigest).toBe(preview.contentDigest);
    const project = await new OpenSpecSddProvider().readProject({ root });
    expect(project.changes[0]).toMatchObject({ id: "add-mfa", contentDigest: preview.contentDigest });
  });

  it("rechaza materialización sin aprobación completa", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yh-materializer-"));
    roots.push(root);
    const environment = createExecutionEnvironment({ workspace: { root, mode: "read-write" }, capabilities: ["workspace.write"] });
    const materializer = new OpenSpecMaterializer({ guard: createExecutionEnvironmentGuard(environment), confirmed: true });
    const preview = await materializer.previewDraftChange({ scope: { root }, changeId: "add-mfa", proposal: "# Add MFA", design: "# Design", tasks: "- [ ] Implement" });

    await expect(new MaterializeApprovedChangeUseCase(materializer).execute(preview, [])).rejects.toThrow("cannot be materialized");
  });
});
