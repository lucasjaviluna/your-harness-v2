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
});
