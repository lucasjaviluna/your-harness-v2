import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  CompleteWorkItemUseCase,
  InMemoryRepository,
} from "@your-harness/application";
import { IntentId, WorkItem, WorkItemId, WorkItemStatus, WorkItemTitle } from "@your-harness/domain";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

const workspaces: string[] = [];

const createWorkspace = async (): Promise<string> => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-completion-"));
  workspaces.push(workspace);
  return workspace;
};

const addExecutionRecords = async (workspace: string, outcome: "verified" | "failed") => {
  const store = createLocalOperationalStore({ workspace });
  await store.executionTraces.save({
    id: "trace-completion",
    workItemId: "work-completion",
    specificationId: "spec-completion",
    taskReferences: [],
    runtimeId: "fake",
    runtimeResult: { status: "completed", summary: "done", timestamps: { startedAt: "now" } },
    recordedAt: "2026-09-13T00:00:00.000Z",
  });
  await store.verificationReports.save({
    id: `report-${outcome}`,
    planId: "plan-completion",
    executionTraceId: "trace-completion",
    specificationId: "spec-completion",
    specificationSnapshotDigest: "digest-completion",
    outcome,
    criteria: [],
    createdAt: "2026-09-13T00:01:00.000Z",
  });
  return store;
};

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("CompletionAuthorization", () => {
  it("completes only after explicit authorization and persists the decision", async () => {
    const workspace = await createWorkspace();
    const store = await addExecutionRecords(workspace, "verified");
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    await workItems.save(new WorkItem(
      new WorkItemId("work-completion"),
      new IntentId("intent-completion"),
      new WorkItemTitle("Complete after verification"),
    ).start());

    await new CompleteWorkItemUseCase(
      workItems,
      store.executionTraces,
      store.verificationReports,
      store.completionAuthorizations,
    ).execute({
      workItemId: new WorkItemId("work-completion"),
      authorization: {
        id: "authorization-1",
        workItemId: "work-completion",
        verificationReportId: "report-verified",
        executionTraceId: "trace-completion",
        decision: "authorize-completion",
        authorizedBy: "human-reviewer",
        reason: "Verified report reviewed by the responsible engineer.",
        authorizedAt: "2026-09-13T00:02:00.000Z",
      },
    });

    await expect(workItems.findById(new WorkItemId("work-completion"))).resolves.toMatchObject({
      status: WorkItemStatus.Done,
    });
    await expect(store.completionAuthorizations.findById("authorization-1")).resolves.toMatchObject({
      decision: "authorize-completion",
    });
  });

  it("records rework without mutating the WorkItem and rejects failed completion", async () => {
    const workspace = await createWorkspace();
    const store = await addExecutionRecords(workspace, "failed");
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    await workItems.save(new WorkItem(
      new WorkItemId("work-completion"),
      new IntentId("intent-completion"),
      new WorkItemTitle("Rework after failure"),
    ).start());
    const useCase = new CompleteWorkItemUseCase(
      workItems,
      store.executionTraces,
      store.verificationReports,
      store.completionAuthorizations,
    );

    await expect(useCase.execute({
      workItemId: new WorkItemId("work-completion"),
      authorization: {
        id: "authorization-rework",
        workItemId: "work-completion",
        verificationReportId: "report-failed",
        executionTraceId: "trace-completion",
        decision: "request-rework",
        authorizedBy: "human-reviewer",
        reason: "The verification report contains a failed criterion.",
        authorizedAt: "2026-09-13T00:02:00.000Z",
      },
    })).resolves.toBeUndefined();
    await expect(workItems.findById(new WorkItemId("work-completion"))).resolves.toMatchObject({
      status: WorkItemStatus.InProgress,
    });

    await expect(useCase.execute({
      workItemId: new WorkItemId("work-completion"),
      authorization: {
        id: "authorization-invalid",
        workItemId: "work-completion",
        verificationReportId: "report-failed",
        executionTraceId: "trace-completion",
        decision: "authorize-completion",
        authorizedBy: "human-reviewer",
        reason: "Attempted completion.",
        authorizedAt: "2026-09-13T00:03:00.000Z",
      },
    })).rejects.toThrow("cannot authorize completion");
  });
});
