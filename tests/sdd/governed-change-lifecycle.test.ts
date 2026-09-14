import { describe, expect, it } from "vitest";

import {
  GovernedChangeStatus,
  InMemoryGovernedChangeRepository,
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
    const useCase = new TransitionGovernedChangeUseCase(repository);
    const transition = (status: GovernedChangeStatus, id: string, completionAuthorized?: boolean) =>
      useCase.execute({ ...base, id, requestedStatus: status, changedAt: `2026-09-14T22:0${id.length}:00.000Z`, completionAuthorized });

    await transition(GovernedChangeStatus.Proposed, "change-1");
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
    const useCase = new TransitionGovernedChangeUseCase(repository);
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
