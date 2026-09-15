import { describe, expect, it } from "vitest";

import {
  InMemoryChangeApplyTransitionRepository,
  TransitionChangeApplyUseCase,
} from "@your-harness/application";

const base = {
  changeId: "add-mfa",
  handoffId: "handoff-1",
  attemptId: "attempt-1",
  idempotencyKey: "request-1",
  changeVersion: "1",
  changeDigest: "digest-1",
  provenance: { providerId: "openspec", reference: "openspec/changes/add-mfa" },
  changedBy: "architect@example.com",
  changedByRole: "architect",
  reason: "Apply transition",
};

describe("Change Apply transition use case", () => {
  it("persiste la secuencia y conserva el estado actual", async () => {
    const repository = new InMemoryChangeApplyTransitionRepository();
    const useCase = new TransitionChangeApplyUseCase(repository);
    await useCase.execute({ ...base, id: "transition-1", requestedStatus: "approved", changedAt: "2026-09-15T03:00:00.000Z" });
    await useCase.execute({ ...base, id: "transition-2", requestedStatus: "apply-ready", changedAt: "2026-09-15T03:00:01.000Z" });
    await useCase.execute({ ...base, id: "transition-3", requestedStatus: "applying", changedAt: "2026-09-15T03:00:02.000Z" });
    const failed = await useCase.execute({ ...base, id: "transition-4", requestedStatus: "apply-failed", changedAt: "2026-09-15T03:00:03.000Z" });
    expect(failed.fromStatus).toBe("applying");
    await useCase.execute({ ...base, id: "transition-5", attemptId: "attempt-2", idempotencyKey: "request-2", retryOfAttemptId: "attempt-1", requestedStatus: "applying", changedAt: "2026-09-15T03:00:04.000Z" });
    await expect(repository.findCurrentByChangeId("add-mfa")).resolves.toMatchObject({ toStatus: "applying", attemptId: "attempt-2" });
  });
});
