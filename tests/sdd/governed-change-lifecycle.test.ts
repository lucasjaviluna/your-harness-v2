import { describe, expect, it } from "vitest";

import {
  GovernedChangeStatus,
  InMemoryGovernedChangeRepository,
  InMemoryChangeStageApprovalRepository,
  createChangeStageApproval,
  TransitionGovernedChangeUseCase,
} from "@your-harness/application";

const base = {
  changeId: "add-mfa",
  changeVersion: "1",
  changeDigest: "digest-1",
  provenance: { providerId: "openspec", reference: "openspec/changes/add-mfa" },
  changedBy: "architect@example.com",
  changedByRole: "reviewer",
  reason: "Cambio revisado.",
};

describe("lifecycle gobernado de Change", () => {
  it("aplica transiciones explícitas y conserva el historial", async () => {
    const repository = new InMemoryGovernedChangeRepository();
    const approvals = new InMemoryChangeStageApprovalRepository();
    const useCase = new TransitionGovernedChangeUseCase(repository, approvals);
    const transition = (status: GovernedChangeStatus, id: string, completionAuthorized?: boolean) =>
      useCase.execute({ ...base, id, requestedStatus: status, changedAt: `2026-09-14T22:0${id.length}:00.000Z`, completionAuthorized });

    await transition(GovernedChangeStatus.Proposed, "change-1");
    for (const [index, stage] of ["proposal", "design", "task-plan", "apply-readiness", "verification-completion"].entries()) {
      await approvals.save(createChangeStageApproval({
        id: `approval-${stage}`,
        changeId: base.changeId,
        stage: stage as "proposal" | "design" | "task-plan" | "apply-readiness" | "verification-completion",
        changeVersion: base.changeVersion,
        changeDigest: base.changeDigest,
        decision: "approve",
        approvedBy: base.changedBy,
        approvedByRole: "reviewer",
        reason: "Aprobado por HITM.",
        approvedAt: `2026-09-14T21:0${index}:00.000Z`,
      }));
    }
    await transition(GovernedChangeStatus.Approved, "change-2");
    await transition(GovernedChangeStatus.Executing, "change-3");
    await transition(GovernedChangeStatus.VerificationPending, "change-4");
    const completed = await transition(GovernedChangeStatus.Completed, "change-5", true);

    expect(completed.previousStatus).toBe(GovernedChangeStatus.VerificationPending);
    expect(await repository.findByChangeId("add-mfa")).toHaveLength(5);
    expect(await repository.findCurrentByChangeId("add-mfa")).toMatchObject({ status: GovernedChangeStatus.Completed });
  });

  it("rechaza saltos de estado y completion sin autorización", async () => {
    const repository = new InMemoryGovernedChangeRepository();
    const approvals = new InMemoryChangeStageApprovalRepository();
    const useCase = new TransitionGovernedChangeUseCase(repository, approvals);
    const input = { ...base, id: "change-1", changedAt: "2026-09-14T22:00:00.000Z" };

    await expect(useCase.execute({ ...input, requestedStatus: GovernedChangeStatus.Executing })).rejects.toThrow(
      "GOVERNED_CHANGE_MUST_START_PROPOSED",
    );
    await useCase.execute({ ...input, requestedStatus: GovernedChangeStatus.Proposed });
    await expect(useCase.execute({ ...input, id: "change-2", requestedStatus: GovernedChangeStatus.Completed })).rejects.toThrow(
      "GOVERNED_CHANGE_INVALID_TRANSITION",
    );
  });
});
