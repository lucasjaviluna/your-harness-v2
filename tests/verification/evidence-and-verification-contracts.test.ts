import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  createVerificationPlan,
  InMemoryEvidenceRepository,
  RecordEvidenceUseCase,
} from "@your-harness/application";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

const workspaces: string[] = [];

const createWorkspace = async (): Promise<string> => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-verification-"));
  workspaces.push(workspace);
  return workspace;
};

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("Evidence and Verification contracts", () => {
  it("records immutable Evidence only against a durable ExecutionTrace", async () => {
    const workspace = await createWorkspace();
    const store = createLocalOperationalStore({ workspace });
    await store.executionTraces.save({
      id: "trace-1",
      workItemId: "work-1",
      specificationId: "spec-1",
      taskReferences: [],
      runtimeId: "fake",
      runtimeResult: {
        status: "completed",
        summary: "Runtime completed.",
        timestamps: { startedAt: "2026-09-13T00:00:00.000Z" },
      },
      recordedAt: "2026-09-13T00:00:01.000Z",
    });

    const evidence = new InMemoryEvidenceRepository();
    const record = new RecordEvidenceUseCase(
      createLocalOperationalStore({ workspace }).executionTraces,
      evidence,
    );
    const input = {
      id: "evidence-1",
      executionTraceId: "trace-1",
      subject: { kind: "scenario" as const, scenarioId: "valid-login" },
      kind: "test-result" as const,
      outcome: "passed" as const,
      locator: "test-results/login.xml#case-1",
      summary: "Valid login scenario passed.",
      capturedAt: "2026-09-13T00:01:00.000Z",
    };

    await expect(record.execute(input)).resolves.toMatchObject({ id: "evidence-1" });
    await expect(evidence.findByExecutionTraceId("trace-1")).resolves.toHaveLength(1);
    await expect(record.execute(input)).rejects.toThrow("already exists and is immutable");
    await expect(record.execute({ ...input, id: "evidence-2", executionTraceId: "missing" }))
      .rejects.toThrow("ExecutionTrace 'missing' was not found");
  });

  it("defines verification criteria over requirements and scenarios without completion authority", () => {
    const plan = createVerificationPlan({
      id: "plan-1",
      specificationId: "spec-1",
      createdAt: "2026-09-13T00:00:00.000Z",
      criteria: [
        {
          id: "criterion-login",
          subject: { kind: "scenario", scenarioId: "valid-login" },
          expectedEvidenceKinds: ["test-result", "review-note"],
        },
      ],
    });

    expect(plan.criteria[0]?.subject).toEqual({ kind: "scenario", scenarioId: "valid-login" });
    expect(() => createVerificationPlan({ ...plan, criteria: [] })).toThrow(
      "requires at least one criterion",
    );
  });
});
