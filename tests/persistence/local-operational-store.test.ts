import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  IntentId,
  WorkItem,
  WorkItemId,
  WorkItemStatus,
  WorkItemTitle,
} from "@your-harness/domain";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

const workspaces: string[] = [];

const createWorkspace = async (): Promise<string> => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-persistence-"));
  workspaces.push(workspace);
  return workspace;
};

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("LocalOperationalStore", () => {
  it("persists and rehydrates WorkItems across store instances", async () => {
    const workspace = await createWorkspace();
    const workItem = new WorkItem(
      new WorkItemId("persisted-work-item"),
      new IntentId("persisted-intent"),
      new WorkItemTitle("Persist operational work"),
    ).start();

    await createLocalOperationalStore({ workspace }).workItems.save(workItem);
    const restored = await createLocalOperationalStore({ workspace }).workItems.findById(
      new WorkItemId("persisted-work-item"),
    );

    expect(restored?.id.value).toBe("persisted-work-item");
    expect(restored?.intentId.value).toBe("persisted-intent");
    expect(restored?.title.value).toBe("Persist operational work");
    expect(restored?.status).toBe(WorkItemStatus.InProgress);
    await expect(
      readFile(
        path.join(workspace, ".your-harness/state/work-items/persisted-work-item.json"),
        "utf8",
      ),
    ).resolves.toContain('"version": 1');
  });

  it("persists ExecutionTrace records and indexes them by WorkItem", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });
    await store.executionTraces.save({
      id: "trace-persisted",
      workItemId: "persisted-work-item",
      specificationId: "persisted-specification",
      change: {
        id: "persisted-change",
        provenance: {
          providerId: "openspec",
          reference: "openspec/changes/persisted-change",
        },
      },
      taskReferences: [],
      runtimeId: "fake",
      runtimeResult: {
        status: "completed",
        summary: "Persisted result.",
        timestamps: { startedAt: "2026-09-13T00:00:00.000Z" },
      },
      recordedAt: "2026-09-13T00:00:01.000Z",
    });

    const restored = createLocalOperationalStore({ workspace });
    await expect(restored.executionTraces.findById("trace-persisted")).resolves.toMatchObject({
      change: { id: "persisted-change" },
      runtimeResult: { status: "completed" },
    });
    await expect(
      restored.executionTraces.findByWorkItemId("persisted-work-item"),
    ).resolves.toHaveLength(1);
  });

  it("persists the operational SDD execution binding separately from WorkItem", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });

    await store.executionBindings.save({
      workItemId: "persisted-work-item",
      specificationId: "authentication",
      specificationApproved: true,
      changeId: "add-login",
      taskIds: ["task-1"],
    });

    await expect(
      createLocalOperationalStore({ workspace }).executionBindings.findByWorkItemId(
        new WorkItemId("persisted-work-item"),
      ),
    ).resolves.toEqual({
      workItemId: "persisted-work-item",
      specificationId: "authentication",
      specificationApproved: true,
      changeId: "add-login",
      taskIds: ["task-1"],
    });
  });

  it("persists Evidence, VerificationPlan and VerificationReport across store instances", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });

    await store.evidence.save({
      id: "evidence-1",
      executionTraceId: "trace-1",
      subject: { kind: "scenario", scenarioId: "login" },
      kind: "test-result",
      outcome: "passed",
      summary: "Login test passed.",
      capturedAt: "2026-09-13T00:00:00.000Z",
    });
    await store.verificationPlans.save({
      id: "plan-1",
      executionTraceId: "trace-1",
      specificationId: "spec-1",
      specificationSnapshotDigest: "digest-1",
      criteria: [{
        id: "criterion-1",
        subject: { kind: "scenario", scenarioId: "login" },
        expectedEvidenceKinds: ["test-result"],
      }],
      createdAt: "2026-09-13T00:00:00.000Z",
    });
    await store.verificationReports.save({
      id: "report-1",
      planId: "plan-1",
      executionTraceId: "trace-1",
      specificationId: "spec-1",
      specificationSnapshotDigest: "digest-1",
      outcome: "verified",
      criteria: [{
        criterionId: "criterion-1",
        outcome: "verified",
        evidenceIds: ["evidence-1"],
        summary: "Evidence is sufficient.",
      }],
      createdAt: "2026-09-13T00:00:01.000Z",
    });

    const reopened = createLocalOperationalStore({ workspace });
    await expect(reopened.evidence.findById("evidence-1")).resolves.toMatchObject({
      executionTraceId: "trace-1",
    });
    await expect(reopened.verificationPlans.findById("plan-1")).resolves.toMatchObject({
      specificationId: "spec-1",
    });
    await expect(reopened.verificationReports.findByPlanId("plan-1")).resolves.toHaveLength(1);
  });

  it("rejects identifiers that could escape the local state directory", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });
    const unsafeWorkItem = new WorkItem(
      new WorkItemId("../outside"),
      new IntentId("intent"),
      new WorkItemTitle("Unsafe persistence"),
    );

    await expect(store.workItems.save(unsafeWorkItem)).rejects.toThrow(
      "contains unsupported characters",
    );
  });

  it("persists tool invocation traces for later audit", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });

    await store.toolInvocations.record({
      id: "tool-read-1",
      runtimeId: "pi",
      executionTraceId: "trace-1",
      sessionId: "session-1",
      toolName: "read",
      requestedPath: "src/index.ts",
      resolvedPath: "C:/workspace/src/index.ts",
      bytesRead: 42,
      outcome: "allowed",
      invokedAt: "2026-09-14T00:00:00.000Z",
    });

    await expect(createLocalOperationalStore({ workspace }).toolInvocations.findByRuntimeId("pi"))
      .resolves.toMatchObject([{ toolName: "read", outcome: "allowed", bytesRead: 42 }]);
    await expect(createLocalOperationalStore({ workspace }).toolInvocations.findByExecutionTraceId("trace-1"))
      .resolves.toMatchObject([{ id: "tool-read-1", executionTraceId: "trace-1" }]);
  });
});
