import { describe, expect, it } from "vitest";

import { TaskOrchestrator, type TaskOrchestrationSnapshot } from "@your-harness/application";
import { SpecificationStatus, WorkItemStatus } from "@your-harness/domain";

const snapshot = (): TaskOrchestrationSnapshot => ({
  workItem: { id: "work-1", status: WorkItemStatus.InProgress },
  specification: { id: "spec-1", status: SpecificationStatus.Approved },
  change: {
    id: "change-1",
    version: "1",
    digest: "digest-1",
    approvals: [],
    materialization: "not-materialized",
  },
});

describe("TaskOrchestrator", () => {
  it("solicita la primera aprobación HITM ausente sin producir efectos", () => {
    const result = new TaskOrchestrator().plan(snapshot());

    expect(result).toMatchObject({
      phase: "awaiting-approval",
      actions: [{ kind: "approve-change-stage", stage: "proposal" }],
      blockers: [],
    });
  });

  it("habilita ejecución sólo después del Change materializado y todas sus aprobaciones", () => {
    const input = snapshot();
    input.change!.approvals = ["proposal", "design", "task-plan", "apply-readiness"].map((stage) => ({
      id: `approval-${stage}`,
      changeId: "change-1",
      stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness",
      changeVersion: "1",
      changeDigest: "digest-1",
      decision: "approve" as const,
      approvedBy: "reviewer",
      approvedByRole: "reviewer" as const,
      reason: "Approved.",
      approvedAt: "2026-09-17T00:00:00.000Z",
    }));
    input.change!.materialization = "materialized";

    expect(new TaskOrchestrator().plan(input)).toMatchObject({
      phase: "ready-for-execution",
      actions: [{ kind: "execute-work-item" }],
    });
  });

  it("no confunde runtime completado con autorización de completitud", () => {
    const input = snapshot();
    input.change!.approvals = ["proposal", "design", "task-plan", "apply-readiness"].map((stage) => ({
      id: `approval-${stage}`,
      changeId: "change-1",
      stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness",
      changeVersion: "1",
      changeDigest: "digest-1",
      decision: "approve" as const,
      approvedBy: "reviewer",
      approvedByRole: "reviewer" as const,
      reason: "Approved.",
      approvedAt: "2026-09-17T00:00:00.000Z",
    }));
    input.change!.materialization = "materialized";
    input.execution = { traceId: "trace-1", status: "completed" };

    expect(new TaskOrchestrator().plan(input)).toMatchObject({
      phase: "awaiting-verification",
      actions: [{ kind: "record-evidence-and-verify", executionTraceId: "trace-1" }],
    });
  });
});
