import { describe, expect, it } from "vitest";

import {
  createChangeStageApproval,
  createChangeStageApprovalPolicy,
} from "@your-harness/application";

const base = {
  changeId: "add-mfa",
  changeVersion: "3",
  changeDigest: "digest-3",
  approvedBy: "architect@example.com",
  approvedByRole: "reviewer" as const,
  reason: "Reviewed by a human.",
  approvedAt: "2026-09-14T18:00:00.000Z",
};

const approval = (stage: "proposal" | "design" | "task-plan" | "apply-readiness") =>
  createChangeStageApproval({
    ...base,
    id: `approval-${stage}`,
    stage,
    decision: "approve",
  });

describe("ChangeStageApprovalPolicy", () => {
  it("requires Design approval before Task Plan can advance", () => {
    const decision = createChangeStageApprovalPolicy().evaluate({
      ...base,
      stage: "task-plan",
      approvals: [approval("proposal")],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining("design"),
      expect.stringContaining("task-plan"),
    ]));
  });

  it("allows Apply Readiness only after every prior stage is approved", () => {
    const decision = createChangeStageApprovalPolicy().evaluate({
      ...base,
      stage: "apply-readiness",
      approvals: [approval("proposal"), approval("design"), approval("task-plan"), approval("apply-readiness")],
    });

    expect(decision).toEqual({ allowed: true, changeId: "add-mfa", stage: "apply-readiness", reasons: [] });
  });

  it("invalidates approvals when the version or digest changes", () => {
    const decision = createChangeStageApprovalPolicy().evaluate({
      ...base,
      stage: "design",
      changeVersion: "4",
      approvals: [approval("proposal"), approval("design")],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons[0]).toContain("version '4'");
  });

  it("does not accept a rework decision as approval", () => {
    const decision = createChangeStageApprovalPolicy().evaluate({
      ...base,
      stage: "design",
      approvals: [approval("proposal"), { ...approval("design"), id: "rework", decision: "request-rework" }],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining([expect.stringContaining("design")]));
  });
});
