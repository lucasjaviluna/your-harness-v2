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
import { OpenSpecMaterializer } from "../../src/sdd/openspec/index.js";
import { OpenSpecSddProvider } from "../../src/sdd/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("OpenSpecMaterializer", () => {
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
