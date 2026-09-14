import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ApproveChangeStageUseCase,
  createChangeStageApproval,
} from "@your-harness/application";
import { createLocalOperationalStore } from "../../src/persistence/index.js";
import { OpenSpecSddProvider } from "../../src/sdd/index.js";

const roots: string[] = [];

const createOpenSpecWorkspace = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yh-change-governance-"));
  roots.push(root);
  await mkdir(path.join(root, "openspec/changes/add-mfa"), { recursive: true });
  await writeFile(path.join(root, "openspec/changes/add-mfa/proposal.md"), "# Add MFA\n\n## Why\nProtect accounts.\n");
  await writeFile(path.join(root, "openspec/changes/add-mfa/design.md"), "# Design\n");
  await writeFile(path.join(root, "openspec/changes/add-mfa/tasks.md"), "- [ ] Add challenge\n");
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("OpenSpec Change governance vertical slice", () => {
  it("reads OpenSpec, approves every stage and reopens durable approvals", async () => {
    const workspace = await createOpenSpecWorkspace();
    const project = await new OpenSpecSddProvider().readProject({ root: workspace });
    const change = project.changes[0];
    if (!change) throw new Error("Expected an OpenSpec Change fixture.");

    const store = createLocalOperationalStore({ workspace });
    const useCase = new ApproveChangeStageUseCase(store.changeStageApprovals);
    const stages = ["proposal", "design", "task-plan", "apply-readiness"] as const;

    for (const [index, stage] of stages.entries()) {
      await useCase.execute(createChangeStageApproval({
        id: `approval-${stage}`,
        changeId: change.id,
        stage,
        changeVersion: change.version,
        changeDigest: change.contentDigest,
        decision: "approve",
        approvedBy: "architect@example.com",
        approvedByRole: "reviewer",
        reason: `Aprobación HITM de ${stage}.`,
        approvedAt: `2026-09-14T18:0${index}:00.000Z`,
      }));
    }

    const reopened = createLocalOperationalStore({ workspace });
    const approvals = await reopened.changeStageApprovals.findByChangeId(change.id);
    expect(approvals).toHaveLength(4);
    expect(approvals.every((approval) => approval.changeDigest === change.contentDigest)).toBe(true);
  });
});
