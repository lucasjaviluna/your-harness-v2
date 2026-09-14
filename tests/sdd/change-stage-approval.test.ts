import { describe, expect, it } from "vitest";

import {
  createChangeStageApproval,
  InMemoryChangeStageApprovalRepository,
} from "@your-harness/application";

const approval = createChangeStageApproval({
  id: "approval-design-1",
  changeId: "add-mfa",
  stage: "design",
  changeVersion: "3",
  changeDigest: "design-digest",
  decision: "approve",
  approvedBy: "architect@example.com",
  approvedByRole: "reviewer",
  reason: "La solución y sus impactos fueron revisados.",
  approvedAt: "2026-09-14T18:00:00.000Z",
});

describe("ChangeStageApproval", () => {
  it("preserva la aprobación ligada a etapa, versión y digest", () => {
    expect(approval).toMatchObject({
      changeId: "add-mfa",
      stage: "design",
      changeVersion: "3",
      changeDigest: "design-digest",
      decision: "approve",
    });
  });

  it("registra rework como decisión sin mutar el Change", () => {
    expect(createChangeStageApproval({ ...approval, id: "approval-design-2", decision: "request-rework" }).decision)
      .toBe("request-rework");
  });

  it("mantiene las aprobaciones inmutables por id", async () => {
    const repository = new InMemoryChangeStageApprovalRepository();
    await repository.save(approval);

    await expect(repository.save(approval)).rejects.toThrow("already exists and is immutable");
    await expect(repository.findByChangeId("add-mfa")).resolves.toHaveLength(1);
  });
});
